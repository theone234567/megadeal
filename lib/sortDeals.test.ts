import { describe, expect, it } from "vitest";
import { soldOutLast, sortDeals } from "./sortDeals";
import type { Deal } from "./types";

const d = (name: string, inStock: boolean, expiresAt: string, now = 10) => ({ name, inStock, expiresAt, now, discountPercent: 0 }) as unknown as Deal;

describe("sold-out deals", () => {
  it("go after every deal people can still get, each group keeping its order", () => {
    const list = [d("a", false, "2026-10-20"), d("b", true, "2026-10-21"), d("c", true, "2026-10-22"), d("e", false, "2026-10-23")];
    expect(soldOutLast(list).map((x) => x.name)).toEqual(["b", "c", "a", "e"]);
  });

  it("stay last whatever the sort, even when one ends soonest", () => {
    const list = [d("later", true, "2026-10-30"), d("sold", false, "2026-10-16"), d("soon", true, "2026-10-18")];
    expect(sortDeals(list, "ending").map((x) => x.name)).toEqual(["soon", "later", "sold"]);
    expect(sortDeals(list, "priceAsc").map((x) => x.name).at(-1)).toBe("sold");
  });
});

describe("Recommended: every category taking turns", () => {
  const c = (name: string, category: string, expiresAt: string, inStock = true) =>
    ({ name, inStock, expiresAt, now: 10, discountPercent: 0, categories: [category] }) as unknown as Deal;

  it("takes one from each category per round, soonest ending first within a round", () => {
    const list = [
      c("food1", "Food & Drink", "2026-10-21"),
      c("food2", "Food & Drink", "2026-10-22"),
      c("food3", "Food & Drink", "2026-10-23"),
      c("spa1", "Beauty & Spa", "2026-10-25"),
      c("car1", "Home & Car", "2026-10-30"),
      c("spa2", "Beauty & Spa", "2026-10-26"),
    ];
    expect(sortDeals(list, "recommended").map((x) => x.name)).toEqual(["food1", "spa1", "car1", "food2", "spa2", "food3"]);
  });

  it("keeps sold-out deals last and loses none", () => {
    const list = [
      c("sold", "Food & Drink", "2026-10-20", false),
      c("spa1", "Beauty & Spa", "2026-10-28"),
      c("spa2", "Beauty & Spa", "2026-10-29"),
      c("food", "Food & Drink", "2026-10-30"),
    ];
    // The sold-out food deal doesn't use up Food & Drink's first turn.
    expect(sortDeals(list, "recommended").map((x) => x.name)).toEqual(["spa1", "food", "spa2", "sold"]);
    expect(sortDeals([], "recommended")).toEqual([]);
  });
});
