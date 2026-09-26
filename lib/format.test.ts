import { describe, it, expect, vi, afterEach } from "vitest";
import { truncateForMeta, formatOfferEndDate } from "./format";

describe("truncateForMeta", () => {
  it("leaves short text alone", () => {
    expect(truncateForMeta("  A short description.  ")).toBe("A short description.");
  });

  it("cuts at a word boundary and marks the cut", () => {
    const out = truncateForMeta("one two three four five six", 12);
    expect(out).toBe("one two…");
  });

  it("never splits a word", () => {
    const text = "Wood-fired pizza night for two with a shared burrata salad and dessert";
    const out = truncateForMeta(text, 40);
    expect(out.endsWith("…")).toBe(true);
    expect(text.startsWith(out.slice(0, -1))).toBe(true);
    expect(text[out.length - 1]).toBe(" ");
  });
});

describe("formatOfferEndDate", () => {
  afterEach(() => vi.useRealTimers());

  it("uses New Zealand time, not the server's", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    // 11:30am UTC on 25 Oct is 12:30am on 26 Oct in Auckland (NZDT, UTC+13).
    expect(formatOfferEndDate("2026-10-25T11:30:00Z")).toBe("26 October");
  });

  it("adds the year only when it isn't this year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    expect(formatOfferEndDate("2027-01-20T00:00:00Z")).toBe("20 January 2027");
  });

  it("includes the time when asked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
    // 26 Sept is the day before NZ daylight saving starts, so UTC+12.
    expect(formatOfferEndDate("2026-09-26T03:05:00Z", true)).toMatch(/^26 September at 3:05\s?pm$/);
  });
});
