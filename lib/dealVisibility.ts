import type { Deal } from "./types";

/**
 * True if a deal should show on the public site now: not explicitly
 * hidden by moderation status, started (a scheduled deal waits for its
 * start time), and — if it has an expiry — not yet past it. Shared by every public deal-listing path (fetch-time filtering in
 * lib/fetchDeals.ts and lib/fetchDealServer.ts, and the periodic re-check
 * in client components) so an expired deal disappears everywhere, not
 * just wherever happened to filter for it.
 */
export function isDealLive(deal: Pick<Deal, "status" | "expiresAt"> & { startsAt?: string | null }, now: number = Date.now()): boolean {
  if (deal.status !== null && deal.status !== "Live") return false;
  // A scheduled deal (lib/dealSchedule.ts) is approved but hidden until
  // its start time, worked out here rather than by a job flipping it on.
  if (deal.startsAt && new Date(deal.startsAt).getTime() > now) return false;
  if (deal.expiresAt && new Date(deal.expiresAt).getTime() <= now) return false;
  return true;
}
