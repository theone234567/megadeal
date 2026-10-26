import { describe, expect, it } from "vitest";
import { formatMoney, sliceGraphemes, truncateForMeta } from "./format";
import { dealSavingPercent, savingPercentOf } from "./dealSaving";
import { addNzCalendarDays, nzDateTimeParts } from "./nzTime";
import { firstPublicationFields } from "./dealDuration";
import { generateReferralCode, isReferralCodeClash } from "./referral";

// T256: time, text and money edge cases.

describe("saving percentage", () => {
  it("rounds down, so a badge never claims more than the prices give", () => {
    expect(savingPercentOf(100, 50.4)).toBe(49); // 49.6%
    expect(savingPercentOf(10, 7)).toBe(30);
    expect(savingPercentOf(89.99, 44.99)).toBe(50); // 50.005%
    expect(dealSavingPercent(50, 50)).toBeNull();
    expect(savingPercentOf(0, 0)).toBe(0);
    expect(savingPercentOf(NaN, 5)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("never prints NaN, and defaults to NZ dollars", () => {
    expect(formatMoney(NaN, "NZD")).toBe("—");
    expect(formatMoney(Infinity, "NZD")).toBe("—");
    expect(formatMoney(49, "")).toBe("$49");
    expect(formatMoney(49.5, "NZD")).toBe("$49.50");
    expect(formatMoney(49.999, "NZD")).toBe("$50");
    expect(formatMoney(0.004, "NZD")).toBe("$0");
  });
});

describe("truncation", () => {
  it("never cuts an emoji or accented letter in half", () => {
    const text = "Brunch 🥞🥞🥞 at Kōwhai";
    for (let max = 1; max < text.length; max++) {
      const cut = sliceGraphemes(text, max);
      expect(cut.length).toBeLessThanOrEqual(max);
      expect(() => encodeURIComponent(cut)).not.toThrow(); // no lone surrogate
    }
    expect(sliceGraphemes("👨‍👩‍👧 family", 3)).toBe("");
    expect(truncateForMeta("🥞".repeat(100), 9)).toBe("🥞🥞🥞🥞…");
  });
});

describe("whole-day deals across daylight saving", () => {
  it("end at the same NZ clock time they started", () => {
    // 9am NZDT on Sat 4 Apr 2026; daylight saving ends the next morning.
    const start = Date.parse("2026-04-03T20:00:00Z");
    expect(nzDateTimeParts(start)).toEqual({ date: "2026-04-04", time: "09:00" });
    const end = addNzCalendarDays(start, 7);
    expect(nzDateTimeParts(end)).toEqual({ date: "2026-04-11", time: "09:00" });
    expect(end - start).toBe(7 * 86_400_000 + 3_600_000);
    // And in spring, when the clocks go forward (27 Sep 2026).
    const spring = Date.parse("2026-09-25T21:00:00Z"); // 9am NZST Sat 26 Sep
    expect(nzDateTimeParts(addNzCalendarDays(spring, 3))).toEqual({ date: "2026-09-29", time: "09:00" });
  });

  it("is what a 7-day Everyday deal gets when it's published; Flash runs its minutes", () => {
    const now = Date.parse("2026-04-03T20:00:00Z");
    const everyday = firstPublicationFields({ requestedDurationMinutes: 7 * 24 * 60, isFlash: false }, now);
    expect(nzDateTimeParts(Date.parse(everyday.fields!.expiresAt as string)).time).toBe("09:00");
    const flash = firstPublicationFields({ requestedDurationMinutes: 180, isFlash: true }, now);
    expect(Date.parse(flash.fields!.expiresAt as string) - now).toBe(180 * 60_000);
  });
});

describe("referral codes", () => {
  it("are MD and 6 easy-to-read characters, and a clash is recognised", () => {
    const codes = new Set(Array.from({ length: 2000 }, generateReferralCode));
    expect(codes.size).toBe(2000);
    for (const c of codes) expect(c).toMatch(/^MD[2-9A-HJKMNP-Z]{6}$/);
    expect(isReferralCodeClash({ code: "23505", message: 'duplicate key value violates unique constraint "merchants_referral_code_key"' })).toBe(true);
    expect(isReferralCodeClash({ message: 'duplicate key value violates unique constraint "merchants_email_key"' })).toBe(false);
  });
});
