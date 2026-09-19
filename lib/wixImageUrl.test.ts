import { describe, it, expect } from "vitest";
import { wixImageUrl } from "./wixImageUrl";

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

  it("leaves non-Wix URLs unchanged", () => {
    const unsplash = "https://images.unsplash.com/photo-123";
    expect(wixImageUrl(unsplash, 800, 600)).toBe(unsplash);
  });

  it("leaves a lookalike host unchanged", () => {
    const evil = "https://evil-wixstatic.com/media/abc.jpg";
    expect(wixImageUrl(evil, 800, 600)).toBe(evil);
  });
});
