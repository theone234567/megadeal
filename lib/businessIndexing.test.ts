import { describe, expect, it } from "vitest";
import { businessPageIsThin } from "./businessIndexing";

describe("which business pages search engines get", () => {
  it("leaves out only a page with no live deal, no bio and no photos", () => {
    expect(businessPageIsThin({ liveDeals: 0, bio: null, photos: 0 })).toBe(true);
    expect(businessPageIsThin({ liveDeals: 0, bio: "   ", photos: 0 })).toBe(true);
    expect(businessPageIsThin({ liveDeals: 1, bio: null, photos: 0 })).toBe(false);
    expect(businessPageIsThin({ liveDeals: 0, bio: "Neighbourhood pizzeria.", photos: 0 })).toBe(false);
    expect(businessPageIsThin({ liveDeals: 0, bio: null, photos: 2 })).toBe(false);
  });
});
