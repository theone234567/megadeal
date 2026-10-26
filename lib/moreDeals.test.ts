import { describe, expect, it } from "vitest";
import { moreDealsFor } from "./moreDeals";
import type { Deal } from "./types";

const d = (id: string, businessSlug: string, category: string, inStock = true) =>
  ({ id, businessSlug, categories: [category], inStock } as unknown as Deal);

describe("More deals under a deal (T252)", () => {
  const me = d("me", "cafe", "Food & Drink");
  const all = [
    me,
    d("b1", "cafe", "Food & Drink"),
    d("b2", "cafe", "Beauty & Spa", false),
    d("f1", "bistro", "Food & Drink"),
    d("f2", "bistro", "Food & Drink", false),
    d("s1", "spa", "Beauty & Spa"),
  ];

  it("lists the business's others (sold out included), then in-stock suggestions in the same category", () => {
    const { fromBusiness, related } = moreDealsFor(me, all);
    expect(fromBusiness.map((x) => x.id)).toEqual(["b1", "b2"]);
    expect(related.map((x) => x.id)).toEqual(["f1"]);
  });

  it("falls back to any category, still in stock, never repeating the deal or the business's", () => {
    const { related } = moreDealsFor(d("x", "solo", "Home & Car"), all);
    expect(related.map((x) => x.id)).toEqual(["me", "b1", "f1", "s1"]);
    expect(related.some((x) => x.inStock === false)).toBe(false);
  });
});
