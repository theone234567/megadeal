import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_DEALS, exampleDeal } from "./demoDeals";
import { CATEGORIES } from "./categories";

describe("DEMO_DEALS", () => {
  it("can't be taken for a real business's deal", () => {
    for (const d of DEMO_DEALS) {
      expect(d.businessName).toMatch(/^Example /);
      expect(d.businessSlug).toBeNull();
      expect(d.dealCode).toBe("EXAMPLE");
      expect(d.expiresAt).toBeNull();
      expect(d.businessPhone).toBeNull();
      // Reserved for examples: nobody real is ever contacted.
      expect(new URL(d.businessWebsite!).hostname).toMatch(/(^|\.)example\.com$/);
      expect(d.businessBookingEmail).toMatch(/@example\.com$/);
    }
  });

  it("uses the site's own photos, which exist", () => {
    for (const d of DEMO_DEALS) {
      expect(d.image).toMatch(/^\/[a-z0-9/_.-]+\.webp$/);
      expect(existsSync(join(process.cwd(), "public", d.image!))).toBe(true);
    }
  });

  it("each has its own page address", () => {
    const slugs = DEMO_DEALS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
    expect(exampleDeal("pizza")?.name).toMatch(/pizza/i);
    expect(exampleDeal("nope")).toBeNull();
  });

  it("has a real saving and a real category on each", () => {
    for (const d of DEMO_DEALS) {
      expect(d.was).toBeGreaterThan(d.now);
      expect(CATEGORIES.some((c) => c.name === d.categories[0])).toBe(true);
    }
  });
});
