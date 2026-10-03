import { describe, expect, it } from "vitest";
import { isScheduledFuture, missedScheduledStart, parseScheduledStart, SCHEDULE_TOLERANCE_MS } from "./dealSchedule";
import { firstPublicationFields } from "./dealDuration";
import { isDealLive } from "./dealVisibility";
import { dealDisplayStatus, allowedDealActions } from "./dealStatus";
import { sanitizeDraft } from "./dealDraft";

// 3 Oct 2026, 10:00 am NZDT (UTC+13).
const NOW = Date.parse("2026-10-02T21:00:00.000Z");
const HOUR = 3_600_000;

describe("parseScheduledStart", () => {
  it("turns an NZ date and time into UTC", () => {
    expect(parseScheduledStart("2026-10-09", "11:30", NOW)).toEqual({ iso: "2026-10-08T22:30:00.000Z" });
  });

  it("needs 2 hours' notice from a business, none from an admin", () => {
    expect(parseScheduledStart("2026-10-03", "11:30", NOW).error).toMatch(/at least 2 hours/);
    expect(parseScheduledStart("2026-10-03", "12:00", NOW).iso).toBe("2026-10-02T23:00:00.000Z");
    expect(parseScheduledStart("2026-10-03", "10:15", NOW, { admin: true }).iso).toBeTruthy();
    expect(parseScheduledStart("2026-10-03", "09:45", NOW, { admin: true }).error).toMatch(/future/);
  });

  it("stays within 60 days", () => {
    expect(parseScheduledStart("2026-11-30", "12:00", NOW).iso).toBeTruthy();
    expect(parseScheduledStart("2026-12-03", "12:00", NOW).error).toMatch(/60 days/);
  });
});

describe("publishing a scheduled deal", () => {
  const pending = { status: "Pending Approval", isFlash: true, requestedDurationMinutes: 120, scheduledStartAt: "2026-10-08T22:30:00.000Z" };

  it("keeps the agreed start and end, whenever it's approved", () => {
    expect(firstPublicationFields(pending, NOW).fields).toEqual({
      firstPublishedAt: "2026-10-08T22:30:00.000Z",
      expiresAt: "2026-10-09T00:30:00.000Z",
    });
  });

  it("still keeps them when approved just after the start, within the tolerance", () => {
    const start = Date.parse(pending.scheduledStartAt);
    expect(firstPublicationFields(pending, start + SCHEDULE_TOLERANCE_MS - 1000).fields?.firstPublishedAt).toBe(pending.scheduledStartAt);
  });

  it("is refused once the start has passed, instead of being moved", () => {
    const start = Date.parse(pending.scheduledStartAt);
    expect(firstPublicationFields(pending, start + SCHEDULE_TOLERANCE_MS + 1000).error).toMatch(/needs a new start time/);
    expect(missedScheduledStart(pending, start + SCHEDULE_TOLERANCE_MS + 1000)).toBe(true);
    expect(missedScheduledStart(pending, start)).toBe(false);
  });

  it("an unscheduled deal still starts on approval", () => {
    expect(firstPublicationFields({ isFlash: false, requestedDurationMinutes: 1440 }, NOW).fields).toEqual({
      firstPublishedAt: new Date(NOW).toISOString(),
      expiresAt: new Date(NOW + 24 * HOUR).toISOString(),
    });
  });
});

describe("visibility and status", () => {
  const approved = { status: "Live" as const, firstPublishedAt: "2026-10-08T22:30:00.000Z", expiresAt: "2026-10-09T00:30:00.000Z" };

  it("is hidden until its start, shown during its run, gone after", () => {
    const deal = { status: approved.status, expiresAt: approved.expiresAt, startsAt: approved.firstPublishedAt };
    expect(isDealLive(deal, NOW)).toBe(false);
    expect(isDealLive(deal, Date.parse("2026-10-08T23:00:00.000Z"))).toBe(true);
    expect(isDealLive(deal, Date.parse("2026-10-09T00:31:00.000Z"))).toBe(false);
  });

  it("reads as Scheduled to the business until it starts, with the usual actions", () => {
    expect(isScheduledFuture(approved, NOW)).toBe(true);
    expect(dealDisplayStatus(approved, NOW)).toBe("Scheduled");
    expect(dealDisplayStatus(approved, Date.parse("2026-10-08T23:00:00.000Z"))).toBe("Live");
    expect(allowedDealActions("Scheduled").map((a) => a.target)).toEqual(["Paused", "Cancelled"]);
  });
});

describe("drafts", () => {
  it("keep the start choice, and drop anything malformed", () => {
    expect(sanitizeDraft({ startMode: "scheduled", startDate: "2026-10-09", startTime: "11:30" })).toMatchObject({ startMode: "scheduled", startDate: "2026-10-09", startTime: "11:30" });
    expect(sanitizeDraft({ startMode: "later", startDate: "9 Oct", startTime: "noon" })).toMatchObject({ startMode: "on_approval", startDate: "", startTime: "" });
  });
});
