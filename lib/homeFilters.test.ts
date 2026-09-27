import { describe, it, expect } from "vitest";
import type { Deal } from "./types";
import { hasNarrowingFilters, homeHref, matchDeals, parseHomeFilters, splitByType, type HomeFilters } from "./homeFilters";

const NOW = Date.parse("2026-09-27T20:00:00Z");
const HOUR = 3_600_000;

function deal(p: Partial<Deal> & { id: string }): Deal {
  return {
    slug: p.id,
    name: "Deal",
    description: "",
    image: null,
    now: 49,
    was: 80,
    formattedNow: null,
    formattedWas: null,
    discountPercent: 39,
    currency: "NZD",
    categories: ["Food & Drink"],
    inStock: true,
    isFlash: false,
    expiresAt: new Date(NOW + 10 * 24 * HOUR).toISOString(),
    status: "Live",
    businessName: "Harbour & Hearth",
    businessCity: "Auckland",
    businessLat: null,
    businessLng: null,
    ...p,
  } as Deal;
}

const params = (s: string) => new URLSearchParams(s);
const base: HomeFilters = parseHomeFilters(params(""));

const catalogue = [
  deal({ id: "pizza", name: "Wood-fired pizza for two" }),
  deal({ id: "steak", name: "Steak & wine", isFlash: true, expiresAt: new Date(NOW + 2 * HOUR).toISOString(), now: 69 }),
  deal({ id: "facial", name: "Luxury facial", categories: ["Beauty & Spa"], isFlash: true, expiresAt: new Date(NOW + HOUR).toISOString() }),
  deal({ id: "massage", name: "Relaxation massage", categories: ["Beauty & Spa"], now: 120, businessCity: "Wellington" }),
  deal({ id: "expired", name: "Old pizza", expiresAt: new Date(NOW - 1000).toISOString() }),
  deal({ id: "paused", name: "Paused pizza", status: "Paused" }),
];
const ids = (list: Deal[]) => list.map((d) => d.id);

describe("parseHomeFilters", () => {
  it("reads the URL and ignores unknown values", () => {
    const f = parseHomeFilters(params("q=pizza&category=food-drink&type=flash&price=under50&sort=priceAsc&within=5"));
    expect(f).toMatchObject({ q: "pizza", category: "food-drink", type: "flash", price: "under50", sort: "priceAsc", within: 5 });
    const junk = parseHomeFilters(params("category=megashop&type=saved&price=cheap&sort=random&within=7"));
    expect(junk).toMatchObject({ category: "", type: "all", price: "", sort: "ending", within: null });
  });
});

describe("homeHref", () => {
  it("keeps the other filters when one changes, and leaves defaults out", () => {
    const f = parseHomeFilters(params("q=pizza&city=Auckland&type=flash"));
    expect(homeHref(f, { category: "beauty-spa" })).toBe("/?q=pizza&city=Auckland&category=beauty-spa&type=flash");
    // "All categories" resets only the category
    const withCat = { ...f, category: "beauty-spa" };
    expect(homeHref(withCat, { category: "" })).toBe("/?q=pizza&city=Auckland&type=flash");
    expect(homeHref(base)).toBe("/");
  });
});

describe("matchDeals + splitByType", () => {
  it("keeps expired and paused deals out", () => {
    expect(ids(matchDeals(catalogue, base, NOW))).not.toContain("expired");
    expect(ids(matchDeals(catalogue, base, NOW))).not.toContain("paused");
  });

  it("puts Flash first-class in its own collection and never repeats it in Everyday", () => {
    const { flash, everyday } = splitByType(matchDeals(catalogue, base, NOW), "all");
    expect(ids(flash)).toEqual(["facial", "steak"]); // ending soonest first
    expect(ids(everyday).sort()).toEqual(["massage", "pizza"]);
    expect(ids(everyday).some((id) => ids(flash).includes(id))).toBe(false);
  });

  it("scopes both collections by the same category", () => {
    const f = { ...base, category: "beauty-spa" };
    const { flash, everyday } = splitByType(matchDeals(catalogue, f, NOW), "all");
    expect(ids(flash)).toEqual(["facial"]);
    expect(ids(everyday)).toEqual(["massage"]);
  });

  it("Food & Drink + Flash shows only Flash food deals", () => {
    const f = { ...base, category: "food-drink", type: "flash" as const };
    const { flash, everyday } = splitByType(matchDeals(catalogue, f, NOW), f.type);
    expect(ids(flash)).toEqual(["steak"]);
    expect(everyday).toEqual([]);
  });

  it("Beauty & Spa + Everyday shows only Everyday beauty deals", () => {
    const f = { ...base, category: "beauty-spa", type: "everyday" as const };
    const { flash, everyday } = splitByType(matchDeals(catalogue, f, NOW), f.type);
    expect(flash).toEqual([]);
    expect(ids(everyday)).toEqual(["massage"]);
  });

  it("combines search, city and price", () => {
    expect(ids(matchDeals(catalogue, { ...base, q: "PIZZA" }, NOW))).toEqual(["pizza"]);
    expect(ids(matchDeals(catalogue, { ...base, q: "harbour" }, NOW)).length).toBe(4); // business name
    expect(ids(matchDeals(catalogue, { ...base, city: "wellington" }, NOW))).toEqual(["massage"]);
    expect(ids(matchDeals(catalogue, { ...base, price: "100to200" }, NOW))).toEqual(["massage"]);
    expect(matchDeals(catalogue, { ...base, q: "pizza", city: "Wellington" }, NOW)).toEqual([]);
  });

  it("drops a deal the moment it expires", () => {
    const later = NOW + HOUR + 1;
    expect(ids(matchDeals(catalogue, base, later))).not.toContain("facial");
    expect(ids(matchDeals(catalogue, base, NOW + HOUR - 1))).toContain("facial");
  });

  it("filters by distance only when there is a location to measure from", () => {
    const near = deal({ id: "near", businessLat: -36.85, businessLng: 174.76 });
    const far = deal({ id: "far", businessLat: -41.29, businessLng: 174.78 });
    const f = { ...base, within: 5 };
    expect(ids(matchDeals([near, far], f, NOW, { lat: -36.848, lng: 174.763 }))).toEqual(["near"]);
    expect(ids(matchDeals([near, far], f, NOW, null)).sort()).toEqual(["far", "near"]);
  });
});

describe("hasNarrowingFilters", () => {
  it("ignores the deal type", () => {
    expect(hasNarrowingFilters({ ...base, type: "flash" })).toBe(false);
    expect(hasNarrowingFilters({ ...base, category: "food-drink" })).toBe(true);
  });
});
