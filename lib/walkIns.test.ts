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

import { getThisDealCopy, websiteCodeAction, websiteCodeError } from "./booking";

describe("customers enter this code on my website", () => {
  const ok = { code: "SUMMER-20", onWebsite: true, url: "https://cafe.co.nz/book", tested: true };
  it("needs the business's own code, a web link and a tested confirmation", () => {
    expect(websiteCodeError(ok)).toBeNull();
    expect(websiteCodeError({ ...ok, onWebsite: false, url: "", tested: false })).toBeNull();
    expect(websiteCodeError({ ...ok, code: "" })).toMatch(/own code/);
    expect(websiteCodeError({ ...ok, code: "MEGA-ABCDE" })).toMatch(/own code/);
    expect(websiteCodeError({ ...ok, url: "javascript:alert(1)" })).toMatch(/web address/);
    expect(websiteCodeError({ ...ok, url: "" })).toMatch(/web address/);
    expect(websiteCodeError({ ...ok, tested: false })).toMatch(/tried this exact code/);
  });

  it("makes the deal's link the main action, labelled for the offer", () => {
    const deal = { dealCode: "SUMMER-20", codeOnWebsite: true, codeWebsiteUrl: "https://cafe.co.nz/shop" };
    expect(websiteCodeAction(deal, "not_required")).toMatchObject({ label: "Shop this offer", href: "https://cafe.co.nz/shop" });
    expect(websiteCodeAction(deal, "required")).toMatchObject({ label: "Book online" });
    expect(websiteCodeAction({ ...deal, codeOnWebsite: false }, "required")).toBeNull();
    expect(websiteCodeAction({ ...deal, codeOnWebsite: null }, "required")).toBeNull();
    expect(websiteCodeAction({ ...deal, dealCode: "MEGA-ABCDE" }, "required")).toBeNull();
    expect(websiteCodeAction({ ...deal, codeWebsiteUrl: "not a link" }, "required")).toBeNull();
    expect(websiteCodeAction({ ...deal, codeWebsiteUrl: "javascript:alert(1)" }, "required")).toBeNull();
  });

  it("only says 'enter at checkout' when the business confirmed it (older deals keep the old rule)", () => {
    expect(getThisDealCopy("required", "book_online", "SUMMER-20", { websiteCode: true }).instruction).toMatch(/enter this code at checkout/);
    expect(getThisDealCopy("required", "book_online", "SUMMER-20", { websiteCode: false }).instruction).not.toMatch(/checkout/);
    expect(getThisDealCopy("required", "book_online", "SUMMER-20").instruction).toMatch(/enter this code at checkout/);
    expect(getThisDealCopy("not_required", "book_online", "SUMMER-20", { websiteCode: true }).instruction).toBe(
      "Enter this code at checkout on the business's website, and check the discount applies before paying.",
    );
    expect(getThisDealCopy("not_required", null, "SUMMER-20", { websiteCode: false }).instruction).toBe(
      "Show this code before ordering or paying.",
    );
  });
});
