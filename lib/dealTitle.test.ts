import { describe, expect, it } from "vitest";
import { TITLE_MAX, businessTitle, dealTitles } from "./dealTitle";

const base = {
  name: "Pizza for two",
  businessName: "Harbour & Hearth",
  businessSuburb: "Takapuna",
  businessCity: "Auckland",
  discountPercent: 30,
  price: "$29",
};

describe("dealTitles", () => {
  it("uses the full title when it fits", () => {
    const t = dealTitles({ ...base, businessName: "Hearth" });
    expect(t.title).toBe("Pizza for two at Hearth, Takapuna, Auckland — 30% off, $29");
    expect(t.title).toBe(t.full);
  });

  it("keeps the full title for sharing", () => {
    expect(dealTitles(base).full).toBe("Pizza for two at Harbour & Hearth, Takapuna, Auckland — 30% off, $29");
  });

  it("drops the city first, then the price, then the discount, then the place", () => {
    expect(dealTitles(base).title).toBe("Pizza for two at Harbour & Hearth, Takapuna — 30% off, $29");
    expect(dealTitles({ ...base, name: "Pizza with a jug" }).title).toBe(
      "Pizza with a jug at Harbour & Hearth, Takapuna — 30% off"
    );
    expect(dealTitles({ ...base, name: "Pizza and a jug of beer" }).title).toBe(
      "Pizza and a jug of beer at Harbour & Hearth, Takapuna"
    );
    expect(dealTitles({ ...base, name: "Two pizzas, garlic bread and a jug of beer" }).title).toBe(
      "Two pizzas, garlic bread and a jug of beer at Harbour & Hearth"
    );
  });

  it("never cuts the name or business, even when they're long", () => {
    const name = "A very long deal name that goes on and on about what's included";
    expect(dealTitles({ ...base, name }).title).toBe(`${name} at Harbour & Hearth`);
  });

  it("every shortened title fits", () => {
    for (const name of ["Pizza with a jug", "Two pizzas and a jug", "Pizza and a jug of beer"]) {
      expect(dealTitles({ ...base, name }).title.length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it("shows the price alone when there's no discount", () => {
    expect(dealTitles({ ...base, discountPercent: 0 }).title).toBe("Pizza for two at Harbour & Hearth, Takapuna, Auckland — $29");
  });

  it("uses the city when there's no suburb, and 'in' without a business", () => {
    expect(dealTitles({ ...base, businessSuburb: null }).title).toBe("Pizza for two at Harbour & Hearth, Auckland — 30% off, $29");
    expect(dealTitles({ ...base, businessName: null }).title).toBe("Pizza for two in Takapuna, Auckland — 30% off, $29");
    expect(dealTitles({ ...base, businessName: null, businessSuburb: null, businessCity: null }).title).toBe("Pizza for two — 30% off, $29");
  });

  it("doesn't repeat the city when the suburb names it", () => {
    expect(dealTitles({ ...base, name: "Pizza", businessSuburb: "Auckland CBD" }).title).toBe("Pizza at Harbour & Hearth, Auckland CBD — 30% off, $29");
  });
});

describe("businessTitle", () => {
  const b = { businessName: "Harbour & Hearth", suburb: "Takapuna", city: "Auckland" };

  it("names the suburb and city when it fits", () => {
    expect(businessTitle(b)).toBe("Harbour & Hearth, Takapuna, Auckland — Deals & Offers");
  });

  it("leaves out a place the name already says", () => {
    expect(businessTitle({ ...b, businessName: "Auckland Rapid Plumbing" })).toBe("Auckland Rapid Plumbing, Takapuna — Deals & Offers");
    expect(businessTitle({ ...b, businessName: "Takapuna Beach Cafe" })).toBe("Takapuna Beach Cafe, Auckland — Deals & Offers");
  });

  it("shortens long ones: city, then wording, then suburb", () => {
    const at = (businessName: string) => businessTitle({ ...b, businessName });
    expect(at("The Harbour & Hearth Kitchen")).toBe("The Harbour & Hearth Kitchen, Takapuna — Deals & Offers");
    expect(at("The Harbour & Hearth Kitchen and Bar")).toBe("The Harbour & Hearth Kitchen and Bar, Takapuna — Deals");
    expect(at("The Harbour & Hearth Kitchen, Bar and Grill")).toBe("The Harbour & Hearth Kitchen, Bar and Grill — Deals");
    // Never cut: the name is what people search for.
    expect(at("The Harbour & Hearth Kitchen, Bar, Grill and Wine Room")).toBe("The Harbour & Hearth Kitchen, Bar, Grill and Wine Room");
  });

  it("works without a place", () => {
    expect(businessTitle({ ...b, suburb: null, city: null })).toBe("Harbour & Hearth — Deals & Offers");
  });
});
