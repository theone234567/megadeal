import { describe, expect, it } from "vitest";
import { isSafeOptionalUrl, isValidSocialUrl } from "./socialLinks";

describe("isSafeOptionalUrl", () => {
  it("accepts a plain web address, with or without https://", () => {
    expect(isSafeOptionalUrl("")).toBe(true);
    expect(isSafeOptionalUrl("cafe.co.nz")).toBe(true);
    expect(isSafeOptionalUrl("www.cafe.co.nz/book?day=mon")).toBe(true);
    expect(isSafeOptionalUrl("https://cafe.co.nz/a:b")).toBe(true);
    expect(isSafeOptionalUrl("http://cafe.co.nz")).toBe(true);
  });

  it("refuses script and data links however they're written", () => {
    expect(isSafeOptionalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeOptionalUrl("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeOptionalUrl("javascript://%0aalert(1)")).toBe(false);
    expect(isSafeOptionalUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeOptionalUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("refuses what the database won't store, so the business gets a message instead of an error", () => {
    expect(isSafeOptionalUrl("my cafe.co.nz")).toBe(false);
    expect(isSafeOptionalUrl("cafe.co.nz:8080")).toBe(false);
  });
});

describe("isValidSocialUrl", () => {
  it("accepts the platform's own pages", () => {
    expect(isValidSocialUrl("facebook.com/cafe", "facebook")).toBe(true);
    expect(isValidSocialUrl("https://www.instagram.com/cafe", "instagram")).toBe(true);
  });

  it("refuses other sites and links the database won't store", () => {
    expect(isValidSocialUrl("https://evil.example/facebook.com/page", "facebook")).toBe(false);
    expect(isValidSocialUrl("javascript://facebook.com/%0aalert(1)", "facebook")).toBe(false);
    expect(isValidSocialUrl("facebook.com:443/cafe", "facebook")).toBe(false);
  });
});

describe("normaliseSocialUrl (T249)", () => {
  it("turns a handle into the page's address", async () => {
    const { normaliseSocialUrl } = await import("./socialLinks");
    expect(normaliseSocialUrl("@kahikatea.cafe", "instagram")).toBe("https://www.instagram.com/kahikatea.cafe");
    expect(normaliseSocialUrl("kahikatea_cafe", "instagram")).toBe("https://www.instagram.com/kahikatea_cafe");
    expect(normaliseSocialUrl("@kahikateacafe", "facebook")).toBe("https://www.facebook.com/kahikateacafe");
    expect(normaliseSocialUrl("@x y", "instagram")).toBeNull();
  });

  it("drops tracking, upgrades http and keeps Facebook's page id", async () => {
    const { normaliseSocialUrl } = await import("./socialLinks");
    expect(normaliseSocialUrl("http://facebook.com/kahikatea/?ref=bookmarks&fbclid=abc", "facebook")).toBe("https://facebook.com/kahikatea");
    expect(normaliseSocialUrl("https://www.instagram.com/kahikatea/?igsh=xyz#top", "instagram")).toBe("https://www.instagram.com/kahikatea");
    expect(normaliseSocialUrl("www.facebook.com/profile.php?id=1000123&mibextid=x", "facebook")).toBe("https://www.facebook.com/profile.php?id=1000123");
    expect(normaliseSocialUrl("facebook.com/profile.php", "facebook")).toBeNull();
  });

  it("refuses bare roots, other sites and odd schemes; blank is fine", async () => {
    const { normaliseSocialUrl, isValidSocialUrl } = await import("./socialLinks");
    expect(normaliseSocialUrl("https://instagram.com/", "instagram")).toBeNull();
    expect(normaliseSocialUrl("instagram.com", "instagram")).toBeNull();
    expect(normaliseSocialUrl("https://evil.example/instagram.com/x", "instagram")).toBeNull();
    expect(normaliseSocialUrl("javascript:alert(1)", "facebook")).toBeNull();
    expect(normaliseSocialUrl("  ", "facebook")).toBe("");
    expect(isValidSocialUrl("", "instagram")).toBe(true);
  });
});

describe("reserved hosts (T249)", () => {
  it("aren't a business's website", async () => {
    const { isSafeOptionalUrl, safeWebHref } = await import("./socialLinks");
    for (const url of ["example.com", "https://www.example.org/x", "shop.example", "cafe.test", "a.invalid", "x.localhost"]) {
      expect(isSafeOptionalUrl(url)).toBe(false);
      expect(safeWebHref(url)).toBeNull();
    }
    expect(isSafeOptionalUrl("kahikatea.co.nz")).toBe(true);
    expect(isSafeOptionalUrl("examples.com")).toBe(true);
  });
});
