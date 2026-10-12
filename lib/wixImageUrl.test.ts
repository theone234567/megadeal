import { describe, it, expect } from "vitest";
import { wixImageSrcSet, wixImageUrl } from "./wixImageUrl";

describe("wixImageUrl", () => {
  it("appends a fill transform to a real Wix media URL", () => {
    expect(wixImageUrl("https://static.wixstatic.com/media/abc.jpg", 800, 600)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_800,h_600/file.webp"
    );
  });

  it("rounds fractional dimensions", () => {
    expect(wixImageUrl("https://static.wixstatic.com/media/abc.jpg", 799.6, 600.2)).toBe(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_800,h_600/file.webp"
    );
  });

  it("can ask for a JPEG, for social-share previews", () => {
    expect(wixImageUrl("https://static.wixstatic.com/media/abc.jpg", 1200, 630, "jpg")).toBe(
      "https://static.wixstatic.com/media/abc.jpg/v1/fill/w_1200,h_630/file.jpg"
    );
  });

  it("leaves non-Wix URLs unchanged", () => {
    const unsplash = "https://images.unsplash.com/photo-123";
    expect(wixImageUrl(unsplash, 800, 600)).toBe(unsplash);
  });

  it("leaves a lookalike host unchanged", () => {
    const evil = "https://evil-wixstatic.com/media/abc.jpg";
    expect(wixImageUrl(evil, 800, 600)).toBe(evil);
  });
});

describe("wixImageSrcSet", () => {
  const photo = "https://static.wixstatic.com/media/abc_123~mv2.jpg";

  it("lists the photo at each width, same shape", () => {
    expect(wixImageSrcSet(photo, [360, 750], 3 / 2)).toBe(
      `${photo}/v1/fill/w_360,h_240/file.webp 360w, ${photo}/v1/fill/w_750,h_500/file.webp 750w`
    );
  });

  it("gives nothing for photos Wix can't resize", () => {
    expect(wixImageSrcSet("https://images.unsplash.com/photo-1", [360], 3 / 2)).toBeUndefined();
  });
});

describe("the deal page's photo sizes", () => {
  it("are all ones MegaDeal's own photo storage makes, so a phone never gets the full-size original", async () => {
    const { SITE_URL } = await import("./siteConfig");
    const own = `${SITE_URL}/media/photos/2026-10/deal-photo.jpg`;
    // As app/deal/[slug]/DealDetail.tsx asks for them.
    const set = wixImageSrcSet(own, [540, 750, 1200], 3 / 2);
    expect(set).toBeDefined();
    expect(set).toContain("1200w");
    const { PHOTO_SIZES } = await import("./photoUrl");
    expect(PHOTO_SIZES.has("1200x800")).toBe(true);
  });
});
