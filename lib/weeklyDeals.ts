import { dealsDigestBody } from "./announcement";
import { nzDateTimeParts } from "./nzTime";
import type { Deal } from "./types";

/**
 * The weekly "new deals" email to customers who signed up for deal alerts
 * (app/api/cron/weekly-deals): from launch, each Thursday evening, the
 * Everyday deals that started that week. Sent with the announcement
 * machinery (lib/announcementSend.ts): each subscriber once a week, their
 * own unsubscribe link, a batch an hour until everyone has it.
 */

export const WEEKLY_SUBJECT = "New deals in Auckland this week";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
// Sending opens Thursday 5 pm and closes Sunday 5 pm (NZ time): people
// read it before the weekend, and a run that was missed isn't sent stale
// on a Monday.
const OPENS_AT = "17:00";
const WINDOW_DAYS = 3;

const weekday = (ms: number) =>
  new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short" }).format(new Date(ms));

/** "weekly-2026-10-29" while that Thursday's sending window is open, else null. */
export function weeklyCampaign(now: number = Date.now()): string | null {
  const today = nzDateTimeParts(now);
  for (let back = 0; back <= WINDOW_DAYS; back++) {
    const ms = now - back * DAY_MS;
    if (weekday(ms) !== "Thu") continue;
    if (back === 0 && today.time < OPENS_AT) return null;
    if (back === WINDOW_DAYS && today.time >= OPENS_AT) return null;
    return `weekly-${nzDateTimeParts(ms).date}`;
  }
  return null;
}

/** The email's text: the Everyday deals that started in the last week,
 *  or "" when none did (that week isn't sent: no new deals, no email). */
export function weeklyDealsBody(deals: Deal[], siteUrl: string, now: number = Date.now()): string {
  const week = deals.filter((d) => !d.isFlash && d.startsAt && now - Date.parse(d.startsAt) <= WEEK_MS);
  return week.length ? dealsDigestBody(week, siteUrl, now) : "";
}
