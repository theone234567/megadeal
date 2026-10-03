import { describe, expect, it } from "vitest";
import { bookingConflict, termsSayWalkInsWelcome, termsSayWhileStocksLast } from "./booking";
import { keyRestrictions, parseTerms, renderTerms } from "./dealTerms";

describe("walk-ins and limited stock in the terms", () => {
  const walkIns = renderTerms(["walk-ins", "one-per-customer"], "");
  it("round-trips through the stored terms text", () => {
    expect(walkIns).toBe("Walk-ins welcome. One per customer.");
    expect(termsSayWalkInsWelcome(walkIns)).toBe(true);
    expect(parseTerms(walkIns).selectedIds).toEqual(["walk-ins", "one-per-customer"]);
    expect(termsSayWhileStocksLast(renderTerms(["while-stocks"], ""))).toBe(true);
  });

  it("isn't fooled by a business's own sentence mentioning walk-ins", () => {
    expect(termsSayWalkInsWelcome("No walk-ins welcome on Fridays.")).toBe(false);
  });

  it("can't be combined with a booking requirement", () => {
    expect(bookingConflict("required", walkIns)).toMatch(/Walk-ins welcome/);
    expect(bookingConflict("recommended", renderTerms(["walk-ins", "bookings"], ""))).toMatch(/Walk-ins welcome/);
    expect(bookingConflict("recommended", walkIns)).toBeNull();
    expect(bookingConflict("not_required", walkIns)).toBeNull();
  });

  it("shows limited stock in the short conditions summary", () => {
    expect(keyRestrictions(renderTerms(["while-stocks"], ""))).toEqual(["While stocks last"]);
  });
});
