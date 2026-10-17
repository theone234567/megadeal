import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_DEALS } from "./demoDeals";
import { CATEGORIES } from "./categories";

describe("DEMO_DEALS", () => {
  it("can't be taken for a real business's deal", () => {
    for (const d of DEMO_DEALS) {
      expect(d.businessName).toMatch(/^Example /);
      expect(d.businessSlug).toBeNull();
      expect(d.dealCode).toBeNull();
      expect(d.expiresAt).toBeNull();
      expect(d.slug).toMatch(/^demo-/);
    }
  });

  it("uses the site's own photos, which exist", () => {
    for (const d of DEMO_DEALS) {
      expect(d.image).toMatch(/^\/[a-z0-9/_.-]+\.webp$/);
      expect(existsSync(join(process.cwd(), "public", d.image!))).toBe(true);
    }
  });

  it("has a real saving and a real category on each", () => {
    for (const d of DEMO_DEALS) {
      expect(d.was).toBeGreaterThan(d.now);
      expect(CATEGORIES.some((c) => c.name === d.categories[0])).toBe(true);
    }
  });
});
