import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { staticImageSrcSet } from "./staticImages";

describe("staticImageSrcSet", () => {
  it("offers the 640px copy with the original for listed photos only", () => {
    expect(staticImageSrcSet("/images/beauty-spa/beauty-massage.webp")).toBe(
      "/images/beauty-spa/beauty-massage-640.webp 640w, /images/beauty-spa/beauty-massage.webp 900w"
    );
    expect(staticImageSrcSet("/images/somewhere-else.webp")).toBeUndefined();
    expect(staticImageSrcSet("https://static.wixstatic.com/media/x.jpg")).toBeUndefined();
  });

  it("points only at files that exist in public/", () => {
    const srcset = staticImageSrcSet("/images/advertise/things-to-do/adventure-outdoors-v1.webp")!;
    for (const part of srcset.split(", ")) {
      expect(fs.existsSync(path.join("public", part.split(" ")[0]))).toBe(true);
    }
  });
});
