import { isDealLive } from "../dealVisibility";
import type { DealStatus } from "../types";
import { inTransaction, type Sql } from "./sql";

/**
 * Deletes a business with everything of its own: every deal (submitted
 * ones too), its credit history and its old page addresses (both go with
 * it in the database), in one transaction. For tidying up test
 * businesses: the ordinary delete keeps a business that has submitted
 * deals, as a record of credits spent.
 *
 * After launch it refuses while any of its deals is live on the site, so
 * a real deal page can't disappear by mistake: pause or cancel first.
 * Before launch nothing is public, so it doesn't.
 *
 * Says which login the business had (ownerId), for the caller to delete
 * too if asked; nothing here touches logins.
 */
export type DeleteOutcome =
  | { ok: true; name: string; email: string; deals: number; ownerId: string | null }
  | { ok: false; status: number; error: string };

export async function deleteBusinessCompletely(db: Sql, merchantId: string, opts: { launched: boolean; now?: number }): Promise<DeleteOutcome> {
  if (!/^[0-9a-f-]{36}$/i.test(merchantId)) return { ok: false, status: 404, error: "Business not found." };
  return inTransaction(db, async (tx) => {
    // Locked, so a deal can't be submitted for it halfway through.
    const [m] = await tx.query<{ business_name: string | null; email: string | null; owner_id: string | null }>(
      "select business_name, email, owner_id::text from public.merchants where id = $1 for update",
      [merchantId]
    );
    if (!m) return { ok: false, status: 404, error: "Business not found." };
    const deals = await tx.query<{ status: DealStatus; first_published_at: string | null; expires_at: string | null }>(
      "select status, to_json(first_published_at) #>> '{}' as first_published_at, to_json(expires_at) #>> '{}' as expires_at from public.deals where merchant_id = $1",
      [merchantId]
    );
    if (opts.launched) {
      const live = deals.filter((d) => isDealLive({ status: d.status, startsAt: d.first_published_at, expiresAt: d.expires_at }, opts.now)).length;
      if (live > 0) {
        return {
          ok: false,
          status: 409,
          error: `${live} of this business's deals ${live === 1 ? "is" : "are"} live on the site. Pause or cancel ${live === 1 ? "it" : "them"} first, then delete.`,
        };
      }
    }
    await tx.query("delete from public.deals where merchant_id = $1", [merchantId]);
    await tx.query("delete from public.merchants where id = $1", [merchantId]);
    return { ok: true, name: m.business_name ?? "", email: m.email ?? "", deals: deals.length, ownerId: m.owner_id };
  });
}
