import { describe, expect, it } from "vitest";
import { hasMarkup, NO_MARKUP_PATTERN } from "./nameRules";
import { checkDealFields } from "./dealSubmission";

describe("names refuse < and >", () => {
  it("spots markup but allows everyday names", () => {
    expect(hasMarkup('<script>alert("x")</script> Café')).toBe(true);
    expect(hasMarkup("<img src=x onerror=alert(1)> Brunch")).toBe(true);
    expect(hasMarkup('Kai Ora Kitchen – Ōtāhuhu & Co "Quotes" 🍕')).toBe(false);
    expect(new RegExp(`^(?:${NO_MARKUP_PATTERN})$`).test("Harbour Pizza Co")).toBe(true);
    expect(new RegExp(`^(?:${NO_MARKUP_PATTERN})$`).test("a<b")).toBe(false);
  });

  it("a deal named with markup is refused", () => {
    const r = checkDealFields(
      { dealName: "<b>Brunch</b> for two", description: "Eggs and coffee", terms: "One per customer", priceNow: 20, priceWas: 30, durationDays: 7, category: "Food & Drink" },
      { typeBlocked: () => null, maxDuration: () => 1e9, photoError: () => null }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/< and >/);
  });
});
