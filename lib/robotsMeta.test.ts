import { describe, expect, it } from "vitest";
import { HUB_MIN_DEALS, hubIsIndexable } from "./robotsMeta";

describe("hubIsIndexable", () => {
  it("keeps listing pages with fewer than three live deals out of search", () => {
    expect(HUB_MIN_DEALS).toBe(3);
    expect(hubIsIndexable(0)).toBe(false);
    expect(hubIsIndexable(2)).toBe(false);
    expect(hubIsIndexable(3)).toBe(true);
    expect(hubIsIndexable(40)).toBe(true);
  });
});
