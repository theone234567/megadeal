import type { Deal } from "./types";

/**
 * True if a deal should still show on the public site: not explicitly
 * hidden by moderation status, and — if it has an expiry — not yet past
 * it. Shared by every public deal-listing path (fetch-time filtering in
 * lib/fetchDeals.ts and lib/fetchDealServer.ts, and the periodic re-check
 * in client components) so an expired deal disappears everywhere, not
 * just wherever happened to filter for it.
 */
export function isDealLive(deal: Pick<Deal, "status" | "expiresAt">, now: number = Date.now()): boolean {
  if (deal.status !== null && deal.status !== "Live") return false;
  if (deal.expiresAt && new Date(deal.expiresAt).getTime() <= now) return false;
  return true;
}
