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
