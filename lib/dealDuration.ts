/**
 * How long a listing runs, and when its clock starts.
 *
 * - A Flash Deal runs for at most 6 hours (360 minutes).
 * - An Everyday Deal runs for at most 30 days.
 *
 * The business picks a duration when it submits. That choice is stored as
 * `requestedDurationMinutes` and the deal has no `expiresAt` while it waits
 * for review — review time must not eat into the listing. The clock starts
 * the first time the deal goes live (`firstPublishedAt`), and after that
 * `expiresAt` is fixed: pausing, editing or approving again never restarts
 * or extends it.
 *
 * Deals submitted before this existed have an `expiresAt` computed at
 * submission and no requested duration. Those keep the end date they were
 * given (see firstPublicationFields) rather than having one guessed.
 *
 * One module for the form, the create route, the AI auto-publish and the
 * admin route, so the rules can't drift apart again.
 */

import { SCHEDULE_TOLERANCE_MS } from "./dealSchedule";
import { formatNzDateTime } from "./nzTime";

export const FLASH_MAX_MINUTES = 360;
export const EVERYDAY_MAX_DAYS = 30;
const MINUTE = 60_000;
const DAY = 86_400_000;

export const FLASH_DURATION_OPTIONS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
  { label: "6 hours", minutes: 360 },
] as const;

export const EVERYDAY_DURATION_OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "30 days", days: 30 },
] as const;

export const DEFAULT_FLASH_MINUTES = 60;
export const DEFAULT_EVERYDAY_DAYS = 30;

/** Why a requested duration isn't allowed, or null if it is. Whole
 *  minutes (Flash) or whole days (Everyday) only — a fraction or a
 *  non-number is rejected rather than rounded. */
export function durationError(
  isFlash: boolean,
  value: unknown,
  /** A shorter limit set in the platform settings (minutes for Flash,
   *  days for Everyday); never longer than the product maximum. */
  max?: number,
): string | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1) {
    return isFlash ? "Choose how long the Flash Deal runs." : "Choose how long the deal runs.";
  }
  const limit = Math.min(max ?? Infinity, isFlash ? FLASH_MAX_MINUTES : EVERYDAY_MAX_DAYS);
  if (isFlash && n > limit) {
    const h = limit / 60;
    return Number.isInteger(h)
      ? `Flash Deals can run for up to ${h} hour${h === 1 ? "" : "s"}.`
      : `Flash Deals can run for up to ${limit} minutes.`;
  }
  if (!isFlash && n > limit) return `Deals can run for up to ${limit} day${limit === 1 ? "" : "s"}.`;
  return null;
}

/** The longest a listing of this type may run, in milliseconds. */
export function maxDurationMs(isFlash: boolean): number {
  return isFlash ? FLASH_MAX_MINUTES * MINUTE : EVERYDAY_MAX_DAYS * DAY;
}

/** A valid requested duration in minutes (days converted), for storing. */
export function toRequestedMinutes(isFlash: boolean, value: number): number {
  return isFlash ? value : value * 24 * 60;
}

/** Nearest allowed choice at or below a saved value — an older draft may
 *  hold "3 months" or "24 hours", which the form no longer offers. */
export function clampEverydayDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_EVERYDAY_DAYS;
  const fits = EVERYDAY_DURATION_OPTIONS.filter((o) => o.days <= n);
  return fits.length ? fits[fits.length - 1].days : EVERYDAY_DURATION_OPTIONS[0].days;
}

export function clampFlashMinutes(minutes: unknown): number {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_FLASH_MINUTES;
  const fits = FLASH_DURATION_OPTIONS.filter((o) => o.minutes <= n);
  return fits.length ? fits[fits.length - 1].minutes : FLASH_DURATION_OPTIONS[0].minutes;
}

/** "2 hours", "30 days" — for "Runs for … once approved". */
export function describeMinutes(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    const d = minutes / (24 * 60);
    return d === 7 ? "1 week" : d === 14 ? "2 weeks" : `${d} day${d === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

export type PublicationResult = { fields: Record<string, string>; error?: undefined } | { fields?: undefined; error: string };

/**
 * The fields to write when a deal goes live. Idempotent: a deal that has
 * been published before keeps its clock, so calling this on every
 * approval, retry or resume is safe.
 *
 * - Already published (firstPublishedAt, or `everLive` from before this
 *   field existed): nothing changes.
 * - Has a requested duration: the clock starts now, or at the requested
 *   start time for a scheduled deal (refused if that has passed).
 * - Legacy pending deal (end date set at submission, no requested
 *   duration): keeps that promised end date if it's still ahead; if it
 *   has passed or is missing, publishing is refused until someone sets a
 *   proper end date — a duration isn't guessed.
 */
export function firstPublicationFields(deal: Record<string, any>, now: number = Date.now()): PublicationResult {
  if (deal.firstPublishedAt || deal.everLive) return { fields: {} };
  const nowIso = new Date(now).toISOString();

  const requested = Number(deal.requestedDurationMinutes);
  if (Number.isInteger(requested) && requested > 0) {
    // Stored values were validated at submission; capped again here so a
    // hand-edited row can't publish a longer run than the rules allow.
    const ms = Math.min(requested * MINUTE, maxDurationMs(Boolean(deal.isFlash)));
    // A requested start (lib/dealSchedule.ts): the agreed start and end are
    // kept whenever approval comes before it (or within the tolerance just
    // after it). Any later, the slot it was written for has gone, so it
    // needs a new start time rather than being silently moved.
    const scheduled = deal.scheduledStartAt ? new Date(deal.scheduledStartAt).getTime() : NaN;
    if (Number.isFinite(scheduled)) {
      if (scheduled < now - SCHEDULE_TOLERANCE_MS) {
        return {
          error: `This deal was set to start ${formatNzDateTime(scheduled)}, which has passed. It needs a new start time before it can be approved.`,
        };
      }
      return {
        fields: { firstPublishedAt: new Date(scheduled).toISOString(), expiresAt: new Date(scheduled + ms).toISOString() },
      };
    }
    return { fields: { firstPublishedAt: nowIso, expiresAt: new Date(now + ms).toISOString() } };
  }

  const legacyEnd = deal.expiresAt ? new Date(deal.expiresAt).getTime() : NaN;
  if (Number.isFinite(legacyEnd) && legacyEnd > now) {
    return { fields: { firstPublishedAt: nowIso } };
  }
  return {
    error: Number.isFinite(legacyEnd)
      ? "This deal's end date passed while it was waiting for review. Set a new end date before publishing it."
      : "This deal has no run length saved. Set an end date before publishing it.",
  };
}

/**
 * Checks an end date an admin sets by hand. It must be in the future and
 * within the listing's maximum run, counted from when it first went live
 * (or from now, for a deal not yet published).
 */
export function manualExpiryError(deal: Record<string, any>, expiresAt: string, now: number = Date.now()): string | null {
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return "Invalid end date.";
  if (end <= now) return "The end date must be in the future.";
  const startedAt = deal.firstPublishedAt ? new Date(deal.firstPublishedAt).getTime() : now;
  const start = Number.isFinite(startedAt) ? startedAt : now;
  if (end - start > maxDurationMs(Boolean(deal.isFlash)) + MINUTE) {
    return deal.isFlash
      ? "A Flash Deal can run for up to 6 hours from when it first went live."
      : "A deal can run for up to 30 days from when it first went live.";
  }
  return null;
}

/** The run lengths a business can pick, up to a maximum set in the
 *  platform settings (minutes for Flash, days for Everyday). The maximum
 *  itself is always offered, so a limit of 10 days can be chosen. */
export function flashOptionsUpTo(maxMinutes: number): { label: string; minutes: number }[] {
  const max = Math.min(maxMinutes, FLASH_MAX_MINUTES);
  const list: { label: string; minutes: number }[] = FLASH_DURATION_OPTIONS.filter((o) => o.minutes <= max);
  if (!list.some((o) => o.minutes === max)) {
    const h = max / 60;
    list.push({ label: Number.isInteger(h) ? `${h} hour${h === 1 ? "" : "s"}` : `${max} minutes`, minutes: max });
  }
  return list;
}

export function everydayOptionsUpTo(maxDays: number): { label: string; days: number }[] {
  const max = Math.min(maxDays, EVERYDAY_MAX_DAYS);
  const list: { label: string; days: number }[] = EVERYDAY_DURATION_OPTIONS.filter((o) => o.days <= max);
  if (!list.some((o) => o.days === max)) list.push({ label: `${max} day${max === 1 ? "" : "s"}`, days: max });
  return list;
}
