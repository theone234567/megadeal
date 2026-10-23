import { describe, expect, it } from "vitest";
import { weeklyCampaign, weeklyDealsBody } from "./weeklyDeals";
import type { Deal } from "./types";

// NZ daylight time in late October 2026 is UTC+13: Thursday 29 Oct 5 pm NZ = 04:00 UTC.
const nz = (iso: string) => Date.parse(iso);

describe("weeklyCampaign", () => {
  it("opens Thursday 5 pm and closes Sunday 5 pm, NZ time", () => {
    expect(weeklyCampaign(nz("2026-10-29T03:59:00Z"))).toBeNull(); // Thu 4:59 pm
    expect(weeklyCampaign(nz("2026-10-29T04:00:00Z"))).toBe("weekly-2026-10-29"); // Thu 5 pm
    expect(weeklyCampaign(nz("2026-10-30T20:00:00Z"))).toBe("weekly-2026-10-29"); // Sat 9 am
    expect(weeklyCampaign(nz("2026-11-01T03:59:00Z"))).toBe("weekly-2026-10-29"); // Sun 4:59 pm
    expect(weeklyCampaign(nz("2026-11-01T04:00:00Z"))).toBeNull(); // Sun 5 pm
    expect(weeklyCampaign(nz("2026-11-02T22:00:00Z"))).toBeNull(); // Tue
  });
});

describe("weeklyDealsBody", () => {
  const now = nz("2026-10-29T05:00:00Z");
  const deal = (over: Partial<Deal>): Deal =>
    ({ name: "Two brunches", slug: "two-brunches", businessName: "Harbour Light", businessSuburb: "Ponsonby", now: 45, was: 68, discountPercent: 34, isFlash: false, startsAt: "2026-10-27T00:00:00Z", ...over }) as Deal;

  it("lists the Everyday deals that started this week", () => {
    const body = weeklyDealsBody([deal({}), deal({ name: "Flash coffee", slug: "flash", isFlash: true })], "https://megadeal.co.nz", now);
    expect(body).toContain("New on MegaDeal this week:");
    expect(body).toContain("Two brunches at Harbour Light, Ponsonby ($45, 34% off)\nhttps://megadeal.co.nz/deal/two-brunches");
    expect(body).not.toContain("Flash coffee");
  });

  it("is empty in a week with no new deals, so nothing is sent", () => {
    expect(weeklyDealsBody([deal({ startsAt: "2026-10-01T00:00:00Z" })], "https://megadeal.co.nz", now)).toBe("");
  });
});
