import { inTransaction, type Sql } from "./sql";
import { mapActivity, mapDeal, mapEmailSignup, mapMerchant, type Issue } from "./wixToPostgres";

/**
 * Loads a Wix export (scripts/wix-export.mjs) into the new database, in one
 * transaction: everything lands, or nothing does. Run by
 * scripts/wix-import.mjs; tested in importWix.test.ts.
 *
 * Without `commit` it is a rehearsal: the whole import runs, every rule in
 * the database is checked, the report is written, and then it's all rolled
 * back. Run that as often as needed before the real switch.
 */

type Row = Record<string, any>;

export interface WixExport {
  Merchants?: Row[];
  Deals?: Row[];
  MerchantActivity?: Row[];
  EmailSignups?: Row[];
  ContactMessages?: Row[];
  SiteSettings?: Row[];
  StoresProducts?: Row[];
}

export interface ImportReport {
  committed: boolean;
  counts: Record<string, { exported: number; imported: number }>;
  issues: Issue[];
  /** Paused deals: Wix didn't record who paused them, so each is imported
   *  as paused by the business. Re-pause any an admin paused. */
  pausedDeals: { id: string; name: string; business: string }[];
}

const TABLES = ["merchant_activity", "deals", "email_signups", "contact_messages", "site_settings", "merchants"];

class Rollback extends Error {}

export async function importWixExport(db: Sql, data: WixExport, opts: { commit: boolean; replace?: boolean }): Promise<ImportReport> {
  const report: ImportReport = { committed: false, counts: {}, issues: [], pausedDeals: [] };
  const count = (name: string, exported: number, imported: number) => (report.counts[name] = { exported, imported });

  try {
    await inTransaction(db, async (tx) => {
      const [{ n }] = await tx.query<{ n: number }>("select count(*)::int as n from public.merchants");
      if (n > 0 && !opts.replace) throw new Error("The new database already has businesses in it. Import into an empty database, or use --replace to clear it first.");
      if (opts.replace) for (const t of TABLES) await tx.query(`delete from public.${t}`);

      const insert = async (table: string, row: Row): Promise<string> => {
        const keys = Object.keys(row).filter((k) => row[k] !== undefined);
        const values = keys.map((k) => {
          const v = row[k];
          return v !== null && typeof v === "object" && !(Array.isArray(v) && k === "amenities") ? JSON.stringify(v) : v;
        });
        const [r] = await tx.query<{ id: string }>(
          `insert into public.${table} (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning id::text as id`,
          values
        );
        return r.id;
      };

      // Businesses first: everything else points at them by email.
      const merchantIdByEmail = new Map<string, string>();
      let merchants = 0;
      for (const item of data.Merchants ?? []) {
        const row = mapMerchant(item, report.issues);
        const email = String(row.email ?? "");
        if (!email || merchantIdByEmail.has(email)) {
          report.issues.push({ record: `merchant ${item._id}`, field: "email", problem: email ? "a second business with this email, not imported" : "no email, not imported", value: item.email });
          continue;
        }
        merchantIdByEmail.set(email, await insert("merchants", row));
        merchants++;
      }
      count("Merchants", data.Merchants?.length ?? 0, merchants);

      const productById = new Map<string, Row>();
      for (const p of data.StoresProducts ?? []) productById.set(String(p.id ?? p._id), p);
      let deals = 0;
      for (const item of data.Deals ?? []) {
        const product = item.productId ? productById.get(String(item.productId)) ?? null : null;
        if (item.productId && !product) {
          report.issues.push({ record: `deal ${item._id} (${item.dealName ?? ""})`, field: "productId", problem: "its Stores product is missing, imported without a page", value: item.productId });
        }
        const row = mapDeal(item, product, merchantIdByEmail, report.issues);
        if (!row) continue;
        // A deal whose product is gone can't be on the site.
        if (!product && row.status !== "Draft" && row.status !== "Cancelled") {
          row.status = "Cancelled";
          row.paused_by = null;
          report.issues.push({ record: `deal ${item._id}`, field: "status", problem: "no Stores product, imported as Cancelled", value: item.status });
        }
        const id = await insert("deals", row);
        if (row.status === "Paused") report.pausedDeals.push({ id, name: String(row.name ?? ""), business: String(item.merchantEmail ?? "") });
        deals++;
      }
      count("Deals", data.Deals?.length ?? 0, deals);

      let activity = 0;
      for (const item of data.MerchantActivity ?? []) {
        const row = mapActivity(item, merchantIdByEmail, report.issues);
        if (!row) continue;
        await insert("merchant_activity", row);
        activity++;
      }
      count("MerchantActivity", data.MerchantActivity?.length ?? 0, activity);

      // One row per address and audience: keep the most useful copy
      // (confirmed and subscribed beats unconfirmed beats unsubscribed).
      const signupKey = (r: Row) => `${String(r.email ?? "").trim().toLowerCase()}|${r.audience || "customer"}`;
      const rank = (r: Row) => (r.verified && !r.unsubscribed ? 2 : !r.unsubscribed ? 1 : 0);
      const best = new Map<string, Row>();
      for (const r of data.EmailSignups ?? []) {
        const k = signupKey(r);
        const prev = best.get(k);
        if (!prev || rank(r) > rank(prev)) best.set(k, r);
      }
      // Anyone who unsubscribed in any copy stays unsubscribed.
      for (const r of data.EmailSignups ?? []) if (r.unsubscribed) best.set(signupKey(r), { ...best.get(signupKey(r)), unsubscribed: true });
      let signups = 0;
      for (const item of best.values()) {
        const row = mapEmailSignup(item, report.issues);
        if (!row) continue;
        await insert("email_signups", row);
        signups++;
      }
      count("EmailSignups", data.EmailSignups?.length ?? 0, signups);

      let messages = 0;
      for (const m of data.ContactMessages ?? []) {
        if (!m.name || !m.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m.email ?? ""))) {
          report.issues.push({ record: `contact message ${m._id}`, field: "email", problem: "incomplete, not imported", value: m.email });
          continue;
        }
        await tx.query("insert into public.contact_messages (name, email, message, created_at) values ($1, $2, $3, coalesce($4::timestamptz, now()))", [
          String(m.name).slice(0, 200),
          String(m.email),
          String(m.message).slice(0, 5000),
          m._createdDate ?? null,
        ]);
        messages++;
      }
      count("ContactMessages", data.ContactMessages?.length ?? 0, messages);

      let settings = 0;
      for (const s of data.SiteSettings ?? []) {
        if (!s.key) continue;
        await tx.query("insert into public.site_settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [String(s.key), s.value == null ? null : String(s.value)]);
        settings++;
      }
      count("SiteSettings", data.SiteSettings?.length ?? 0, settings);

      if (!opts.commit) throw new Rollback();
    });
    report.committed = true;
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
  return report;
}
