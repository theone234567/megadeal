import { describe, it, expect } from "vitest";
import {
  clampEverydayDays,
  clampFlashMinutes,
  durationError,
  firstPublicationFields,
  manualExpiryError,
  toRequestedMinutes,
} from "./dealDuration";

const NOW = Date.parse("2026-09-27T20:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;
const DAY = 86_400_000;

describe("durationError", () => {
  it("allows Flash Deals up to 360 minutes and no more", () => {
    expect(durationError(true, 360)).toBeNull();
    expect(durationError(true, 30)).toBeNull();
    expect(durationError(true, 361)).toMatch(/6 hours/);
    expect(durationError(true, 1440)).toMatch(/6 hours/);
  });

  it("allows Everyday Deals up to 30 days and no more", () => {
    expect(durationError(false, 30)).toBeNull();
    expect(durationError(false, 1)).toBeNull();
    expect(durationError(false, 31)).toMatch(/30 days/);
    expect(durationError(false, 90)).toMatch(/30 days/);
  });

  it("rejects fractions, zero, negatives and non-numbers rather than rounding", () => {
    for (const bad of [0, -5, 1.5, 29.9, NaN, Infinity, "abc", "", null, undefined, {}]) {
      expect(durationError(false, bad)).not.toBeNull();
      expect(durationError(true, bad)).not.toBeNull();
    }
    expect(durationError(false, "14")).toBeNull();
  });
});

describe("toRequestedMinutes", () => {
  it("stores both types in minutes", () => {
    expect(toRequestedMinutes(true, 240)).toBe(240);
    expect(toRequestedMinutes(false, 30)).toBe(43_200);
  });
});

describe("clamping old saved choices", () => {
  it("brings an old draft's longer run down to an allowed option", () => {
    expect(clampEverydayDays(90)).toBe(30);
    expect(clampEverydayDays(60)).toBe(30);
    expect(clampEverydayDays(14)).toBe(14);
    expect(clampEverydayDays(10)).toBe(7);
    expect(clampEverydayDays(undefined)).toBe(30);
    expect(clampFlashMinutes(1440)).toBe(360);
    expect(clampFlashMinutes(90)).toBe(60);
    expect(clampFlashMinutes(null)).toBe(60);
  });
});

describe("firstPublicationFields", () => {
  it("starts the clock at first publication, not at submission", () => {
    const r = firstPublicationFields({ isFlash: true, requestedDurationMinutes: 360 }, NOW);
    expect(r.fields).toEqual({ firstPublishedAt: iso(NOW), expiresAt: iso(NOW + 360 * MIN) });
    const e = firstPublicationFields({ isFlash: false, requestedDurationMinutes: 30 * 24 * 60 }, NOW);
    expect(e.fields?.expiresAt).toBe(iso(NOW + 30 * DAY));
  });

  it("never restarts or extends a clock that is already running", () => {
    const published = {
      isFlash: true,
      requestedDurationMinutes: 360,
      firstPublishedAt: iso(NOW - 5 * 3_600_000),
      expiresAt: iso(NOW + 3_600_000),
    };
    // approval retry, resume after a pause, or a repeat admin save
    expect(firstPublicationFields(published, NOW).fields).toEqual({});
    expect(firstPublicationFields(published, NOW + 30 * MIN).fields).toEqual({});
  });

  it("leaves a deal that was live before this existed alone", () => {
    expect(firstPublicationFields({ everLive: true, expiresAt: iso(NOW + 60 * DAY) }, NOW).fields).toEqual({});
  });

  it("caps a hand-edited requested duration at the maximum", () => {
    const r = firstPublicationFields({ isFlash: true, requestedDurationMinutes: 5000 }, NOW);
    expect(r.fields?.expiresAt).toBe(iso(NOW + 360 * MIN));
  });

  it("keeps a legacy pending deal's promised end date instead of guessing a duration", () => {
    const end = iso(NOW + 40 * DAY);
    const r = firstPublicationFields({ isFlash: false, expiresAt: end }, NOW);
    expect(r.fields).toEqual({ firstPublishedAt: iso(NOW) });
  });

  it("refuses to publish a legacy pending deal whose end date passed or is missing", () => {
    expect(firstPublicationFields({ expiresAt: iso(NOW - MIN) }, NOW).error).toMatch(/passed/);
    expect(firstPublicationFields({}, NOW).error).toMatch(/no run length/);
  });
});

describe("manualExpiryError", () => {
  it("accepts an end date within the run, counted from first publication", () => {
    const deal = { isFlash: true, firstPublishedAt: iso(NOW - 2 * 3_600_000) };
    expect(manualExpiryError(deal, iso(NOW + 4 * 3_600_000), NOW)).toBeNull();
    expect(manualExpiryError(deal, iso(NOW + 4 * 3_600_000 + 5 * MIN), NOW)).toMatch(/6 hours/);
  });

  it("rejects past dates and runs over 30 days", () => {
    expect(manualExpiryError({}, iso(NOW - MIN), NOW)).toMatch(/future/);
    expect(manualExpiryError({}, iso(NOW + 31 * DAY), NOW)).toMatch(/30 days/);
    expect(manualExpiryError({}, iso(NOW + 30 * DAY), NOW)).toBeNull();
    expect(manualExpiryError({}, "nonsense", NOW)).toMatch(/Invalid/);
  });
});
