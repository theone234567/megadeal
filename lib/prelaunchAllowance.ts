/**
 * Before launch, each business can run 1 Everyday Deal and 1 Flash Deal
 * at a time, free (lib/siteConfig.ts PRELAUNCH_FREE_DEALS): what the
 * homepage's prelaunch bar promises. A deal counts while it's waiting for
 * review, live or paused; once it ends or is cancelled the business can
 * submit another of that type.
 */
interface DealLike {
  status?: string | null;
  isFlash?: boolean | null;
  expiresAt?: string | null;
}

export function prelaunchAllowanceBlock(deals: DealLike[], isFlash: boolean, now: number): string | null {
  const running = deals.some((d) => {
    if (Boolean(d.isFlash) !== isFlash) return false;
    if (d.status === "Pending Approval" || d.status === "Paused") return true;
    if (d.status !== "Live") return false;
    return !d.expiresAt || new Date(d.expiresAt).getTime() > now;
  });
  if (!running) return null;
  return isFlash
    ? "Before launch each business can run 1 Flash Deal at a time, free. You can add another once this one ends, or more from launch day."
    : "Before launch each business can run 1 Everyday Deal at a time, free. You can add another once this one ends, or more from launch day.";
}
