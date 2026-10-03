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

// What NewDealForm sends in test mode: the business form's fields, plus
// the business name and suburb.
const input = {
  businessName: "Test Kitchen",
  suburb: "Ponsonby",
  dealName: "Two-course lunch",
  category: "Food & Drink",
  description: "A starter and a main from the lunch menu.",
  terms: "Bookings essential.",
  priceNow: 39,
  priceWas: 60,
  isFlash: false,
  durationDays: 7,
  quantityAvailable: 20,
  bookingRequirement: "required",
  dealCode: "",
  codeOnWebsite: false,
  codeWebsiteUrl: "",
  codeTested: false,
  photoUrl: TEST_DEAL_PHOTOS[0].src,
};

function make(overrides: Partial<TestDeal> = {}): TestDeal {
  const { fields } = parseTestDealInput(input);
  return { ...fields!, id: "abc", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", startedAt: "2026-10-01T00:00:00.000Z", ...overrides };
}

describe("parseTestDealInput", () => {
  it("accepts what the business form sends, storing days as minutes", () => {
    const { fields, error } = parseTestDealInput(input);
    expect(error).toBeUndefined();
    expect(fields).toMatchObject({ dealName: "Two-course lunch", isFlash: false, durationMinutes: 7 * 24 * 60, priceNow: 39, priceWas: 60, quantityAvailable: 20, photo: TEST_DEAL_PHOTOS[0].src });
  });

  it("uses the business rules: same messages as a real submission", () => {
    expect(parseTestDealInput({ ...input, description: "" }).error).toBe("Deal name, description and terms are required.");
    expect(parseTestDealInput({ ...input, priceWas: 20 }).error).toBe("Original price must be at least the deal price.");
    expect(parseTestDealInput({ ...input, bookingRequirement: "" }).error).toBe("Choose whether customers need to book.");
    expect(parseTestDealInput({ ...input, quantityAvailable: 0 }).error).toBe("Quantity available must be a positive number.");
    expect(parseTestDealInput({ ...input, photoUrl: "" }).error).toBe("Add a photo of your deal.");
  });

  it("allows the product maximums, whatever Platform settings say", () => {
    expect(parseTestDealInput({ ...input, isFlash: true, durationMinutes: 360 }).fields?.durationMinutes).toBe(360);
    expect(parseTestDealInput({ ...input, durationDays: 30 }).fields?.durationMinutes).toBe(30 * 24 * 60);
    expect(parseTestDealInput({ ...input, isFlash: true, durationMinutes: 361 }).error).toBeTruthy();
  });

  it("needs a business name and one of the sample photos", () => {
    expect(parseTestDealInput({ ...input, businessName: " " }).error).toBe("Add a business name to show on the deal.");
    expect(parseTestDealInput({ ...input, photoUrl: "https://static.wixstatic.com/media/x.jpg" }).error).toBe("Pick one of the sample photos.");
  });

  it("ignores fields it doesn't own, such as an id or start time", () => {
    const { fields } = parseTestDealInput({ ...input, id: "x", startedAt: "2000-01-01", isTest: false });
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
    expect(d).toMatchObject({ id: "abc", slug: "test-abc", isTest: true, status: "Live", discountPercent: 35, quantityAvailable: 20, businessSuburb: "Ponsonby" });
    expect([d.businessPhone, d.businessWebsite, d.businessBookingUrl, d.businessBookingEmail, d.businessSlug]).toEqual([null, null, null, null, null]);
    expect(d.expiresAt).toBe("2026-10-08T00:00:00.000Z");
  });

  it("with no original price shows no saving", () => {
    const d = testDealToDeal(make({ priceWas: null }));
    expect([d.was, d.discountPercent]).toEqual([39, 0]);
  });
});

describe("testDealToDraft", () => {
  it("copies the content only: no photo, no code, standard conditions re-ticked", () => {
    const draft = testDealToDraft(make({ dealCode: "SPRING15" }));
    expect(draft).toMatchObject({ dealName: "Two-course lunch", category: "Food & Drink", priceNow: "39", priceWas: "60", quantityAvailable: "20", durationDays: 7, isFlash: false, photoUrl: "", dealCode: "", codeOnWebsite: false });
    expect(draft.selectedTerms.length + (draft.customTerms ? 1 : 0)).toBeGreaterThan(0);
  });
});

describe("readStoredTestDeals", () => {
  it("drops malformed entries", () => {
    expect(readStoredTestDeals("nope")).toEqual([]);
    expect(readStoredTestDeals([make(), { id: 1 }, null])).toHaveLength(1);
  });

  it("carries over test deals saved by the first, shorter form", () => {
    const [t] = readStoredTestDeals([
      { id: "old", name: "Old massage", startedAt: "2026-10-03T00:00:00.000Z", durationMinutes: 60, isFlash: true, priceNow: 49, priceWas: 99, photo: TEST_DEAL_PHOTOS[2].src, businessName: "Spa", suburb: "", category: "Beauty & Spa", bookingRequirement: "required", dealCode: "", description: "", terms: "" },
    ]);
    expect(t).toMatchObject({ dealName: "Old massage", priceWas: 99, quantityAvailable: null, codeOnWebsite: false });
  });
});
