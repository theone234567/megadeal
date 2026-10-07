import type { Sql } from "./sql";

/**
 * Unsubscribes made in Wix that MegaDeal's database doesn't have yet:
 * Admin > Moving off Wix > "Bring over unsubscribes from Wix"
 * (app/api/admin/carry-unsubscribes).
 *
 * Unsubscribing keeps working while changes are paused on switch day (it
 * must be honoured at once), so anyone who unsubscribes between the import
 * and the switch is recorded only in Wix. This marks them unsubscribed in
 * the new database too. It only ever unsubscribes: nobody is subscribed or
 * re-subscribed by it, so running it again is always safe.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function carryUnsubscribes(db: Sql, wixSignups: Record<string, unknown>[]): Promise<{ unsubscribedInWix: number; newlyUnsubscribed: number }> {
  let unsubscribedInWix = 0;
  let newlyUnsubscribed = 0;
  const seen = new Set<string>();
  for (const row of wixSignups) {
    if (!row.unsubscribed) continue;
    const email = String(row.email ?? "").trim().toLowerCase();
    const audience = row.audience === "merchant" ? "merchant" : "customer";
    if (!EMAIL_RE.test(email) || seen.has(`${email}|${audience}`)) continue;
    seen.add(`${email}|${audience}`);
    unsubscribedInWix++;
    const updated = await db.query<{ id: string }>(
      `update public.email_signups set unsubscribed = true, unsubscribed_at = coalesce(unsubscribed_at, now())
       where lower(email) = $1 and audience = $2 and not unsubscribed
       returning id::text as id`,
      [email, audience]
    );
    newlyUnsubscribed += updated.length;
  }
  return { unsubscribedInWix, newlyUnsubscribed };
}
