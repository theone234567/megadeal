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
