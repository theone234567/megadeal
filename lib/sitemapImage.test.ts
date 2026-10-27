import { describe, expect, it } from "vitest";
import { sitemapImageUrl } from "./sitemapImage";
import { SITE_URL } from "./siteConfig";

describe("sitemapImageUrl", () => {
  it("makes a site path absolute", () => {
    expect(sitemapImageUrl("/media/photos/a.jpg")).toBe(`${SITE_URL}/media/photos/a.jpg`);
  });
  it("escapes & so the sitemap stays valid XML", () => {
    expect(sitemapImageUrl("https://static.wixstatic.com/media/a.jpg?w=1&h=2")).toBe("https://static.wixstatic.com/media/a.jpg?w=1&amp;h=2");
  });
  it("leaves out nothing, blanks and non-web addresses", () => {
    expect(sitemapImageUrl(null)).toBeNull();
    expect(sitemapImageUrl("")).toBeNull();
    expect(sitemapImageUrl("javascript:alert(1)")).toBeNull();
    expect(sitemapImageUrl("data:image/png;base64,AAAA")).toBeNull();
  });
});
