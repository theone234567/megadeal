import { describe, expect, it } from "vitest";
import {
  TEST_DEAL_PHOTOS,
  parseTestDealInput,
  readStoredTestDeals,
  testDealDurationValue,
  testDealEndsAt,
  testDealRunning,
  testDealToDeal,
  testDealToDraft,
  type TestDeal,
} from "./testDeals";

const input = {
  isFlash: false,
  duration: 7,
  name: "Two-course lunch",
  businessName: "Test Kitchen",
  suburb: "Ponsonby",
  category: "Food & Drink",
  priceNow: "39",
  priceWas: "60",
  photo: TEST_DEAL_PHOTOS[0].src,
  bookingRequirement: "recommended",
  dealCode: "",
  description: "A starter and a main.",
  terms: "Bookings essential.",
};

function make(overrides: Partial<TestDeal> = {}): TestDeal {
  const { fields } = parseTestDealInput(input);
  return { ...fields!, id: "abc", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", startedAt: "2026-10-01T00:00:00.000Z", ...overrides };
}

describe("parseTestDealInput", () => {
  it("accepts a complete Everyday deal, storing days as minutes", () => {
    const { fields, errors } = parseTestDealInput(input);
    expect(errors).toEqual([]);
    expect(fields).toMatchObject({ isFlash: false, durationMinutes: 7 * 24 * 60, priceNow: 39, priceWas: 60 });
  });

  it("takes Flash durations in minutes, up to 6 hours", () => {
    expect(parseTestDealInput({ ...input, isFlash: true, duration: 90 }).fields?.durationMinutes).toBe(90);
    expect(parseTestDealInput({ ...input, isFlash: true, duration: 361 }).errors).toContain("A Flash deal can run for up to 6 hours.");
    expect(parseTestDealInput({ ...input, duration: 31 }).errors).toContain("An Everyday deal can run for up to 30 days.");
  });

  it("explains every missing or wrong field", () => {
    const { fields, errors } = parseTestDealInput({ isFlash: "yes", priceNow: "50", priceWas: "40", photo: "https://evil.example/x.jpg" });
    expect(fields).toBeUndefined();
    expect(errors).toEqual(
      expect.arrayContaining([
        "Give the deal a name.",
        "Add a business name to show on the deal.",
        "Pick a category.",
        "The usual price must be more than the deal price.",
        "Choose how long the deal runs.",
        "Pick a photo.",
        "Say whether customers need to book.",
      ])
    );
  });

  it("only takes photos from the site's own list", () => {
    expect(parseTestDealInput({ ...input, photo: "/megadeal-coming-soon/../secret" }).errors).toContain("Pick a photo.");
  });

  it("ignores unknown fields such as an id or isTest flag", () => {
    const { fields } = parseTestDealInput({ ...input, id: "x", isTest: false, startedAt: "2000-01-01" });
    expect(fields).not.toHaveProperty("id");
    expect(fields).not.toHaveProperty("startedAt");
  });
});

describe("timer", () => {
  it("ends durationMinutes after it (re)started", () => {
    const t = make({ isFlash: true, durationMinutes: 60, startedAt: "2026-10-03T10:00:00.000Z" });
    expect(testDealEndsAt(t)).toBe(Date.parse("2026-10-03T11:00:00.000Z"));
    expect(testDealRunning(t, Date.parse("2026-10-03T10:59:00.000Z"))).toBe(true);
    expect(testDealRunning(t, Date.parse("2026-10-03T11:00:00.000Z"))).toBe(false);
    expect(testDealDurationValue(t)).toBe(60);
    expect(testDealDurationValue(make())).toBe(7);
  });
});

describe("testDealToDeal", () => {
  it("is marked as a test, with no contact details to send anyone to", () => {
    const d = testDealToDeal(make());
    expect(d).toMatchObject({ id: "abc", slug: "test-abc", isTest: true, status: "Live", discountPercent: 35, businessSuburb: "Ponsonby" });
    expect([d.businessPhone, d.businessWebsite, d.businessBookingUrl, d.businessBookingEmail, d.businessSlug]).toEqual([null, null, null, null, null]);
    expect(d.expiresAt).toBe("2026-10-08T00:00:00.000Z");
  });
});

describe("testDealToDraft", () => {
  it("copies the content only: no photo, no code, standard conditions re-ticked", () => {
    const draft = testDealToDraft(make({ dealCode: "SPRING15" }));
    expect(draft).toMatchObject({ dealName: "Two-course lunch", category: "Food & Drink", priceNow: "39", priceWas: "60", durationDays: 7, isFlash: false, photoUrl: "", dealCode: "" });
    expect(draft.selectedTerms.length + (draft.customTerms ? 1 : 0)).toBeGreaterThan(0);
  });
});

describe("readStoredTestDeals", () => {
  it("drops malformed entries", () => {
    expect(readStoredTestDeals("nope")).toEqual([]);
    expect(readStoredTestDeals([make(), { id: 1 }, null])).toHaveLength(1);
  });
});
