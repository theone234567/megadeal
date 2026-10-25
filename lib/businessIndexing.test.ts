import { describe, expect, it } from "vitest";
import { businessPageIndexable } from "./businessIndexing";

describe("which business pages search engines get (T232)", () => {
  const full = { liveDeals: 1, recentDeals: 0, bio: "x".repeat(120), photos: 2, hasAddress: true };
  it("a finished profile with a live deal, or one that ended lately", () => {
    expect(businessPageIndexable(full)).toBe(true);
    expect(businessPageIndexable({ ...full, liveDeals: 0, recentDeals: 1 })).toBe(true);
  });
  it("not a profile with a bio but no deal, a short bio, no photo or no address", () => {
    expect(businessPageIndexable({ ...full, liveDeals: 0 })).toBe(false);
    expect(businessPageIndexable({ ...full, bio: "Neighbourhood pizzeria." })).toBe(false);
    expect(businessPageIndexable({ ...full, photos: 0 })).toBe(false);
    expect(businessPageIndexable({ ...full, hasAddress: false })).toBe(false);
  });
});
