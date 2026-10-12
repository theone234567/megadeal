import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getRateLimitKv } from "./rateLimit";
import type { Sql } from "./db/connection";

/**
 * "Stop MegaDeal business emails": one opt-out per business, for the
 * marketing-type emails businesses get (announcements, "finish your
 * listing" reminders). Never for service email (sign-up codes, password
 * links, approval and deal notices), which must always arrive.
 *
 * The links are signed with the server's secret under their own label,
 * so only a link MegaDeal emailed can opt a business out (an id alone,
 * or a guessed one, does nothing), and they carry the business's id, not
 * its email address. Opting out is a button press on /stop-emails (mail
 * scanners open links, they don't press buttons) or a mail app's own
 * one-click Unsubscribe (RFC 8058) at /api/business-emails/stop.
 */

const OPT_OUT_PREFIX = "biz-email-opt-out:";
const ID_RE = /^[0-9a-f-]{36}$/;

function sign(id: string): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`business-email-opt-out:${id}`).digest("hex").slice(0, 32);
}

/** The page link (for the email's footer) and the one-click address (for
 *  the List-Unsubscribe header). null when the business can't be given one. */
export function businessOptOutLinks(siteUrl: string, id: string): { page: string; oneClick: string } | null {
  if (!ID_RE.test(id)) return null;
  const s = sign(id);
  if (!s) return null;
  const base = siteUrl.replace(/\/$/, "");
  const q = `m=${encodeURIComponent(id)}&s=${s}`;
  return { page: `${base}/stop-emails?${q}`, oneClick: `${base}/api/business-emails/stop?${q}` };
}

/** True only for a link MegaDeal signed for that business. */
export function validBusinessOptOut(id: unknown, sig: unknown): id is string {
  if (typeof id !== "string" || typeof sig !== "string" || !ID_RE.test(id)) return false;
  const expected = sign(id);
  if (!expected || sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/** MegaDeal's own database (site_settings, backed up nightly), or null
 *  when it can't be reached. */
async function inDatabase<T>(fn: (db: Sql) => Promise<T>): Promise<T | null> {
  return (await import("./securityStore")).inDatabase(fn);
}

/** Records the opt-out, for good: in the database (so it's in the nightly
 *  backup and survives anything happening to KV) and in KV (where opt-outs
 *  made before were kept). False only if neither could save it, so the
 *  person isn't told it worked when it didn't. */
export async function optOutBusiness(id: string): Promise<boolean> {
  const at = new Date().toISOString();
  const inDb = await inDatabase(async (db) => {
    await db.query(
      `insert into public.site_settings (key, value) values ($1, $2) on conflict (key) do nothing`,
      [OPT_OUT_PREFIX + id, at],
    );
    return true;
  });
  const kv = await getRateLimitKv();
  let inKv = false;
  if (kv) {
    try {
      await kv.put(OPT_OUT_PREFIX + id, at);
      inKv = true;
    } catch (err) {
      console.error("[businessEmailOptOut] couldn't save to KV", err);
    }
  }
  return inDb === true || inKv;
}

/** Turns business emails back on (the business's own choice, in the
 *  portal): cleared from both places, or false. */
export async function optInBusiness(id: string): Promise<boolean> {
  const db = await inDatabase(async (db) => {
    await db.query(`delete from public.site_settings where key = $1`, [OPT_OUT_PREFIX + id]);
    return true;
  });
  if (db === null) return false;
  const kv = await getRateLimitKv();
  if (!kv) return db === true;
  try {
    await kv.delete(OPT_OUT_PREFIX + id);
    return true;
  } catch (err) {
    console.error("[businessEmailOptOut] couldn't save", err);
    return false;
  }
}

/** The ids of businesses that have opted out, among `ids` (either place
 *  counts). */
export async function optedOutBusinesses(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (ids.length === 0) return out;
  const keys = ids.map((id) => OPT_OUT_PREFIX + id);
  const rows = await inDatabase((db) =>
    db.query<{ key: string }>(`select key from public.site_settings where key = any($1::text[])`, [keys]),
  );
  for (const r of rows ?? []) out.add(r.key.slice(OPT_OUT_PREFIX.length));
  const kv = await getRateLimitKv();
  if (!kv) return out;
  await Promise.all(
    ids.map(async (id) => {
      if (!out.has(id) && (await kv.get(OPT_OUT_PREFIX + id).catch(() => null))) out.add(id);
    }),
  );
  return out;
}
