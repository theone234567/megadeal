import { describe, expect, it } from "vitest";
import { formatNzDateTime, nzDateTimeParts, nzLocalToUtc } from "./nzTime";

describe("nzLocalToUtc", () => {
  it("handles winter (NZST, +12) and summer (NZDT, +13)", () => {
    expect(new Date(nzLocalToUtc("2026-07-15", "12:00").ms!).toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(new Date(nzLocalToUtc("2026-12-15", "12:00").ms!).toISOString()).toBe("2026-12-14T23:00:00.000Z");
  });

  it("refuses the hour skipped when daylight saving starts (27 Sep 2026, 2am -> 3am)", () => {
    expect(nzLocalToUtc("2026-09-27", "02:30").error).toMatch(/doesn't exist/);
    expect(new Date(nzLocalToUtc("2026-09-27", "03:00").ms!).toISOString()).toBe("2026-09-26T14:00:00.000Z");
  });

  it("takes the first of the repeated hour when it ends (5 Apr 2026, 3am -> 2am)", () => {
    expect(new Date(nzLocalToUtc("2026-04-05", "02:30").ms!).toISOString()).toBe("2026-04-04T13:30:00.000Z");
  });

  it("rejects malformed or impossible dates", () => {
    for (const [d, t] of [["", "12:00"], ["2026-02-30", "12:00"], ["2026-13-01", "12:00"], ["2026-06-01", "24:00"], ["2026-06-01", "9:00"]]) {
      expect(nzLocalToUtc(d, t).error).toBeTruthy();
    }
  });

  it("round-trips with nzDateTimeParts", () => {
    const ms = nzLocalToUtc("2026-11-03", "17:45").ms!;
    expect(nzDateTimeParts(ms)).toEqual({ date: "2026-11-03", time: "17:45" });
  });
});

describe("formatNzDateTime", () => {
  it("shows NZ time", () => {
    expect(formatNzDateTime("2026-07-15T00:00:00.000Z")).toMatch(/15 Jul.*12:00/);
  });
});
