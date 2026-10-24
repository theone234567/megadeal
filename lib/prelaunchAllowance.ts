import { dealDisplayStatus } from "./dealStatus";

/**
 * Before launch, each business can run 1 Everyday Deal and 1 Flash Deal
 * at a time, free (lib/siteConfig.ts PRELAUNCH_FREE_DEALS): what the
 * homepage's prelaunch bar promises. A deal counts while it's waiting for
 * review, live (or scheduled) or paused; once it ends or is cancelled the
 * business can submit another of that type. "Ends" is the portal's own rule
 * (dealDisplayStatus): a paused deal whose time has run out has ended too.
 * It used to count for ever, and an ended deal can't be cancelled, so the
 * business could never add another of that type (security pack T130).
 */
interface DealLike {
  status?: string | null;
  isFlash?: boolean | null;
  expiresAt?: string | null;
}

export function prelaunchAllowanceBlock(deals: DealLike[], isFlash: boolean, now: number): string | null {
  const running = deals.some((d) => {
    if (Boolean(d.isFlash) !== isFlash) return false;
    if (d.status !== "Pending Approval" && d.status !== "Live" && d.status !== "Paused") return false;
    return dealDisplayStatus({ status: d.status, expiresAt: d.expiresAt }, now) !== "Ended";
  });
  if (!running) return null;
  return isFlash
    ? "Before launch each business can run 1 Flash Deal at a time, free. You can add another once this one ends, or more from launch day."
    : "Before launch each business can run 1 Everyday Deal at a time, free. You can add another once this one ends, or more from launch day.";
}
