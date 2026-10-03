import { formatNzDateTime, nzLocalToUtc } from "./nzTime";

/**
 * Scheduled start times (handoff pack, FINAL-SPEC §7): a business can ask
 * for its deal to start at a set time instead of as soon as it's approved,
 * e.g. a Flash deal for Friday's lunch. Stored on the Deals row as
 * `scheduledStartAt` (UTC).
 *
 * - The agreed start and end are kept: publication sets firstPublishedAt
 *   to the start and expiresAt to start + run length, whenever approval
 *   happens before it.
 * - Visibility is worked out from those timestamps on every public read
 *   (isDealLive), so no job has to switch a deal on or off at the right
 *   moment, and a late job can't show one early or keep one up late.
 * - If approval would come after the start (beyond a small tolerance) it
 *   is refused, and the deal needs a new start time, rather than being
 *   silently moved off the lunch or class slot it was written for.
 * - Platform settings → "Scheduled start times" turns new scheduling on
 *   and off; turning it off leaves schedules already agreed alone.
 */

/** Earliest start: time for the deal to be reviewed. */
export const SCHEDULE_MIN_LEAD_MS = 2 * 60 * 60 * 1000;
/** Furthest ahead a start can be set. */
export const SCHEDULE_MAX_AHEAD_DAYS = 60;
/** Approval this soon after the start still keeps the agreed times. */
export const SCHEDULE_TOLERANCE_MS = 15 * 60 * 1000;

export type StartMode = "on_approval" | "scheduled";

/**
 * Checks a requested start (NZ date and time from the form). Returns the
 * UTC instant, or why it can't be used.
 */
export function parseScheduledStart(
  date: unknown,
  time: unknown,
  now: number = Date.now(),
  /** An admin rescheduling a deal it is about to approve needs no lead. */
  opts: { admin?: boolean } = {}
): { iso: string; error?: undefined } | { iso?: undefined; error: string } {
  const res = nzLocalToUtc(typeof date === "string" ? date : "", typeof time === "string" ? time : "");
  if (res.error !== undefined) return { error: res.error };
  if (opts.admin ? res.ms <= now : res.ms < now + SCHEDULE_MIN_LEAD_MS) {
    return {
      error: opts.admin
        ? "Choose a start time in the future."
        : "Choose a start at least 2 hours from now, so there's time to review the deal.",
    };
  }
  if (res.ms > now + SCHEDULE_MAX_AHEAD_DAYS * 86_400_000) {
    return { error: `Choose a start within the next ${SCHEDULE_MAX_AHEAD_DAYS} days.` };
  }
  return { iso: new Date(res.ms).toISOString() };
}

function ms(value: unknown): number {
  return typeof value === "string" || value instanceof Date ? new Date(value as string).getTime() : NaN;
}

/** Published, with its start still ahead: approved and waiting to show. */
export function isScheduledFuture(deal: Record<string, any>, now: number = Date.now()): boolean {
  const start = ms(deal.firstPublishedAt);
  return Number.isFinite(start) && start > now;
}

/** Still waiting for approval when its requested start has passed (beyond
 *  the tolerance): it can't be approved until it has a new start time. */
export function missedScheduledStart(
  deal: { status?: unknown; scheduledStartAt?: unknown; firstPublishedAt?: unknown; everLive?: unknown },
  now: number = Date.now()
): boolean {
  if (deal.status !== "Pending Approval" || deal.firstPublishedAt || deal.everLive) return false;
  const start = ms(deal.scheduledStartAt);
  return Number.isFinite(start) && start < now - SCHEDULE_TOLERANCE_MS;
}

/** "Starts Sat 4 Oct, 12:00 pm" for a requested or agreed start. */
export function startLabel(iso: unknown): string | null {
  return typeof iso === "string" && Number.isFinite(Date.parse(iso)) ? `Starts ${formatNzDateTime(iso)}` : null;
}
