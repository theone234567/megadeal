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
