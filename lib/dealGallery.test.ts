import { describe, expect, it } from "vitest";
import { MAX_DEAL_GALLERY, cleanGallery } from "./dealGallery";

describe("cleanGallery", () => {
  const p = (n: number) => `https://megadeal.co.nz/media/photos/2026-10/${n}.jpg`;
  it("keeps the order given, each photo once, never the main photo, at most four", () => {
    expect(cleanGallery([p(2), p(1), p(2), p(3), p(4), p(5), p(6)], p(1))).toEqual([p(2), p(3), p(4), p(5)]);
    expect(MAX_DEAL_GALLERY).toBe(4);
  });
  it("drops what isn't a usable address", () => {
    expect(cleanGallery([p(2), 7, "", null, "https://evil.example/x.jpg"], p(1), (u) => u.startsWith("https://megadeal.co.nz/"))).toEqual([p(2)]);
    expect(cleanGallery("not a list", p(1))).toEqual([]);
  });
});
