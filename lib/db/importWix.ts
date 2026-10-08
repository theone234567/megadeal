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

const TABLES = ["slug_redirects", "merchant_activity", "deals", "email_signups", "contact_messages", "site_settings", "merchants"];

class Rollback extends Error {}

export async function importWixExport(db: Sql, data: WixExport, opts: { commit: boolean; replace?: boolean }): Promise<ImportReport> {
  const report: ImportReport = { committed: false, counts: {}, issues: [], pausedDeals: [] };
  const count = (name: string, exported: number, imported: number) => (report.counts[name] = { exported, imported });

  try {
    await inTransaction(db, async (tx) => {
      const [{ n }] = await tx.query<{ n: number }>("select count(*)::int as n from public.merchants");
      if (n > 0 && !opts.replace) throw new Error("The new database already has businesses in it. Import into an empty database, or use --replace to clear it first.");
      if (opts.replace) for (const t of TABLES) await tx.query(`delete from public.${t}`);

      // A record the database refuses (a rule the checks above missed) is
      // left out and listed, rather than stopping the whole import: the
      // savepoint undoes just that one record.
      const insert = async (table: string, row: Row, record: string): Promise<string | null> => {
        const keys = Object.keys(row).filter((k) => row[k] !== undefined);
        const values = keys.map((k) => {
          const v = row[k];
          return v !== null && typeof v === "object" && !(Array.isArray(v) && k === "amenities") ? JSON.stringify(v) : v;
        });
        await tx.query("savepoint import_record");
        try {
          const [r] = await tx.query<{ id: string }>(
            `insert into public.${table} (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning id::text as id`,
            values
          );
          await tx.query("release savepoint import_record");
          return r.id;
        } catch (err) {
          await tx.query("rollback to savepoint import_record");
          // The database's own words, which name the rule but not the values.
          const reason = err instanceof Error ? err.message : String(err);
          report.issues.push({ record, field: "(whole record)", problem: `the database refused it (${reason}), not imported` });
          return null;
        }
      };

      // One Wix login can own several business records (test businesses
      // made from one account, say), but a login has one business here.
      // The link stays with the one the portal should show: an approved
      // business first, then the most recently changed. The others come
      // across without it, and can be claimed again by email.
      const ownerKeeps = new Map<string, Row>();
      // Wix's SDK gives dates as Date objects, its REST API as { $date }.
      const when = (v: unknown) => {
        const raw = v && typeof v === "object" && "$date" in v ? (v as { $date: unknown }).$date : v;
        const t = raw ? new Date(raw as string).getTime() : NaN;
        return Number.isNaN(t) ? 0 : t;
      };
      const ownerRank = (m: Row) => [m.status === "Approved" ? 1 : 0, when(m._updatedDate ?? m._createdDate)] as const;
      for (const item of data.Merchants ?? []) {
        const owner = item._owner ? String(item._owner) : "";
        // A record with no email isn't imported, so it can't keep the link.
        if (!owner || !String(item.email ?? "").trim()) continue;
        const kept = ownerKeeps.get(owner);
        const [a1, a2] = ownerRank(item);
        const [b1, b2] = kept ? ownerRank(kept) : [-1, -1];
        if (!kept || a1 > b1 || (a1 === b1 && a2 > b2)) ownerKeeps.set(owner, item);
      }

      // Values the database allows once only: a repeat keeps its record but
      // loses that value, and is listed, rather than stopping the import.
      const taken = new Map<string, Set<string>>();
      const keepOnce = (table: string, row: Row, record: string, fields: string[]) => {
        for (const field of fields) {
          const v = row[field];
          if (v == null) continue;
          const seen = taken.get(`${table}.${field}`) ?? new Set<string>();
          taken.set(`${table}.${field}`, seen);
          if (seen.has(String(v))) {
            report.issues.push({ record, field, problem: "the same as on an earlier record, left out", value: v });
            row[field] = null;
          } else seen.add(String(v));
        }
      };

      // Businesses first: everything else points at them by email.
      const merchantIdByEmail = new Map<string, string>();
      let merchants = 0;
      for (const item of data.Merchants ?? []) {
        const row = mapMerchant(item, report.issues);
        if (row.wix_owner_id && ownerKeeps.get(String(row.wix_owner_id)) !== item) {
          report.issues.push({
            record: `merchant ${item._id} (${item.businessName ?? ""})`,
            field: "_owner",
            problem: "its Wix login also owns another business, so it was imported without that link (it can be claimed again by email)",
            value: item._owner,
          });
          row.wix_owner_id = null;
        }
        const email = String(row.email ?? "");
        if (!email || merchantIdByEmail.has(email)) {
          report.issues.push({ record: `merchant ${item._id}`, field: "email", problem: email ? "a second business with this email, not imported" : "no email, not imported", value: item.email });
          continue;
        }
        const record = `merchant ${item._id} (${item.businessName ?? ""})`;
        keepOnce("merchants", row, record, ["wix_id", "referral_code"]);
        const id = await insert("merchants", row, record);
        if (!id) continue;
        merchantIdByEmail.set(email, id);
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
        const record = `deal ${item._id} (${item.dealName ?? ""})`;
        keepOnce("deals", row, record, ["wix_id", "wix_product_id"]);
        // A deal whose product is gone can't be on the site.
        if (!product && row.status !== "Draft" && row.status !== "Cancelled") {
          row.status = "Cancelled";
          row.paused_by = null;
          report.issues.push({ record: `deal ${item._id}`, field: "status", problem: "no Stores product, imported as Cancelled", value: item.status });
        }
        // The new address format (deal, business, suburb) comes from the
        // database; the Wix one is kept as a permanent redirect.
        const wixSlug = typeof row.slug === "string" ? row.slug : null;
        row.slug = null;
        const id = await insert("deals", row, record);
        if (!id) continue;
        if (wixSlug) {
          await tx.query(
            `insert into public.slug_redirects (kind, old_slug, deal_id)
             select 'deal', $1, id from public.deals where id = $2 and slug is distinct from $1
             on conflict do nothing`,
            [wixSlug, id]
          );
        }
        if (row.status === "Paused") report.pausedDeals.push({ id, name: String(row.name ?? ""), business: String(item.merchantEmail ?? "") });
        deals++;
      }
      count("Deals", data.Deals?.length ?? 0, deals);

      let activity = 0;
      for (const item of data.MerchantActivity ?? []) {
        const row = mapActivity(item, merchantIdByEmail, report.issues);
        if (!row) continue;
        if (!(await insert("merchant_activity", row, `activity ${item._id}`))) continue;
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
        keepOnce("email_signups", row, `email signup ${item._id}`, ["wix_id", "verify_token_hash", "unsubscribe_token_hash"]);
        if (!(await insert("email_signups", row, `email signup ${item._id}`))) continue;
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
