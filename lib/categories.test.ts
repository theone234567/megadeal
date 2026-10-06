import { describe, it, expect } from "vitest";
import { CATEGORIES, categoryBySlug, categoryPath, categoryByLegacySegment } from "./categories";

describe("category URLs", () => {
  it("gives every category a unique, URL-safe slug", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("builds a category's path from its name", () => {
    expect(categoryPath("Food & Drink")).toBe("/auckland/food-drink");
    expect(categoryPath("Home & Car")).toBe("/auckland/home-car");
  });

  it("resolves slugs back to categories", () => {
    expect(categoryBySlug("beauty-spa")?.name).toBe("Beauty & Spa");
    expect(categoryBySlug("Beauty%20%26%20Spa")).toBeUndefined();
    expect(categoryBySlug("nope")).toBeUndefined();
  });

  it("recognises the old percent-encoded URLs so they can redirect", () => {
    expect(categoryByLegacySegment("Food%20%26%20Drink")?.slug).toBe("food-drink");
    expect(categoryByLegacySegment("Things%20To%20Do")?.slug).toBe("things-to-do");
    expect(categoryByLegacySegment("Food%20%26%20Drinks")).toBeUndefined();
    expect(categoryByLegacySegment("%E0%A4%A")).toBeUndefined();
  });
});

describe("old category addresses", () => {
  it("next.config.mjs redirects exactly the real category slugs, in one hop", async () => {
    const { readFileSync } = await import("fs");
    const config = readFileSync("next.config.mjs", "utf8");
    const listed = config.match(/source: "\/category\/:slug\(([^)]+)\)"/)?.[1].split("|").sort();
    expect(listed).toEqual(CATEGORIES.map((c) => c.slug).sort());
  });
});
