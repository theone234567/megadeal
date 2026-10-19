import { describe, expect, it } from "vitest";
import { checkDealFields, type DealFieldRules } from "./dealSubmission";

// The submission checks /api/deals/create used to make inline, now shared
// with admin test deals. Same messages, same order, same status codes.
const rules: DealFieldRules = {
  typeBlocked: () => null,
  maxDuration: (flash) => (flash ? 360 : 30),
  photoError: (url) => (url.startsWith("https://static.wixstatic.com/") ? null : "Invalid photo."),
};
const good = {
  dealName: "Pizza for two",
  description: "Two large pizzas.",
  terms: "Bookings essential.",
  priceNow: 30,
  priceWas: 50,
  isFlash: false,
  durationDays: 14,
  bookingRequirement: "required",
  category: "Food & Drink",
  photoUrl: "https://static.wixstatic.com/media/p.jpg",
  photoMediaId: "m1",
};
const err = (body: object, r: DealFieldRules = rules) => {
  const res = checkDealFields(body, r);
  return res.ok ? null : [res.status, res.error];
};

describe("checkDealFields", () => {
  it("passes a complete deal through, trimmed and typed", () => {
    const res = checkDealFields({ ...good, dealName: "  Pizza for two ", dealCode: "summer 20" }, rules);
    expect(res.ok && res.fields).toMatchObject({ dealName: "Pizza for two", priceNow: 30, priceWas: 50, customDealCode: "SUMMER-20", quantityAvailable: undefined, codeOnWebsite: false });
  });

  it("explains each problem", () => {
    expect(err({ ...good, dealName: "x".repeat(81) })).toEqual([400, "Keep the deal name to 80 characters or fewer."]);
    expect(err({ ...good, terms: "" })).toEqual([400, "Deal name, description and terms are required."]);
    expect(err({ ...good, bookingRequirement: "maybe" })).toEqual([400, "Choose whether customers need to book."]);
    expect(err({ ...good, category: "Pets" })).toEqual([400, "Choose a category."]);
    expect(err({ ...good, priceNow: 0 })).toEqual([400, "Enter a valid deal price."]);
    expect(err({ ...good, priceWas: 10 })).toEqual([400, "Original price must be at least the deal price."]);
    // More than the database can hold: a message, not a failed save.
    expect(err({ ...good, priceNow: 9e9, priceWas: 9.5e9 })).toEqual([400, "That price is too high. Check the number and try again."]);
    expect(err({ ...good, priceWas: 1e8 })).toEqual([400, "That price is too high. Check the number and try again."]);
    expect(err({ ...good, durationDays: 31 })?.[0]).toBe(400);
    expect(err({ ...good, quantityAvailable: 1.5 })).toEqual([400, "Quantity available must be a positive number."]);
    expect(err({ ...good, photoUrl: "" })).toEqual([400, "Add a photo of your deal."]);
    expect(err({ ...good, photoUrl: "https://evil.example/p.jpg" })).toEqual([400, "Invalid photo."]);
  });

  it("refuses a paused type with 403", () => {
    expect(err(good, { ...rules, typeBlocked: () => "Everyday deals are paused." })).toEqual([403, "Everyday deals are paused. Save this deal as a draft for now."]);
  });

  it("treats a missing original price or quantity as not given", () => {
    const res = checkDealFields({ ...good, priceWas: "", quantityAvailable: null }, rules);
    expect(res.ok && [res.fields.priceWas, res.fields.quantityAvailable]).toEqual([undefined, undefined]);
  });

  it("only takes the website-code option with the business's own, tested code", () => {
    expect(err({ ...good, codeOnWebsite: true })).not.toBeNull();
    const res = checkDealFields({ ...good, dealCode: "GLOW20", codeOnWebsite: true, codeWebsiteUrl: "https://spa.example/book", codeTested: true }, rules);
    expect(res.ok && res.fields.codeOnWebsite).toBe(true);
  });
});

describe("tags", () => {
  it("keeps known tags only, in list order, at most five", () => {
    const res = checkDealFields({ ...good, bookingRequirement: "recommended", tags: ["kids", "made-up", "date-night", "kids"] }, rules);
    expect(res.ok && res.fields.tags).toEqual(["date-night", "kids"]);
  });

  it("a deal that needs booking can't say walk-ins are welcome", () => {
    expect(err({ ...good, tags: ["walk-ins-welcome"] })).toEqual([400, 'A deal that needs booking can\'t be tagged "Walk-ins welcome".']);
  });
});

describe("more photos", () => {
  const ok = (n: number) => `https://static.wixstatic.com/media/g${n}.jpg`;
  it("keeps up to four that pass the photo check, never repeating the main photo", () => {
    const res = checkDealFields({ ...good, gallery: [ok(1), good.photoUrl, ok(2)] }, rules);
    expect(res.ok && res.fields.gallery).toEqual([ok(1), ok(2)]);
  });
  it("refuses a photo from anywhere else, or too many", () => {
    expect(err({ ...good, gallery: ["https://evil.example/x.jpg"] })?.[1]).toMatch(/extra photos/);
    expect(err({ ...good, gallery: [1, 2, 3, 4, 5].map(ok) })?.[1]).toMatch(/at most 4/);
  });
});
