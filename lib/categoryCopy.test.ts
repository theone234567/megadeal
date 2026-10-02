import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";
import { CATEGORY_COPY } from "./categoryCopy";

describe("CATEGORY_COPY", () => {
  it("gives every category a search title and heading", () => {
    for (const c of CATEGORIES) {
      const copy = CATEGORY_COPY[c.slug];
      expect(copy, c.slug).toBeDefined();
      expect(copy.title.length, c.slug).toBeGreaterThan(10);
      expect(copy.h1.length, c.slug).toBeGreaterThan(10);
    }
  });

  it("keeps titles short enough that Google shows them whole", () => {
    // The layout appends " | MegaDeal" (11 characters).
    for (const [slug, copy] of Object.entries(CATEGORY_COPY)) {
      expect(`${copy.title} | MegaDeal`.length, slug).toBeLessThanOrEqual(66);
    }
  });
});
