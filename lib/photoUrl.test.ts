import { describe, it, expect } from "vitest";
import { isWixMediaUrl } from "./photoUrl";

describe("isWixMediaUrl", () => {
  it("accepts a real Wix media URL", () => {
    expect(isWixMediaUrl("https://static.wixstatic.com/media/abc.jpg")).toBe(true);
    expect(isWixMediaUrl("https://wixstatic.com/media/abc.jpg")).toBe(true);
  });

  it("rejects a lookalike host an attacker could register", () => {
    // The bug: endsWith("wixstatic.com") matched all of these, so a
    // merchant could serve any image from a host they control on our
    // pages, under our domain's reputation.
    for (const host of [
      "evil-wixstatic.com",
      "notwixstatic.com",
      "wixstatic.com.attacker.net",
      "mywixstatic.com",
    ]) {
      expect(isWixMediaUrl(`https://${host}/media/abc.jpg`)).toBe(false);
    }
  });

  it("rejects non-https", () => {
    expect(isWixMediaUrl("http://static.wixstatic.com/media/abc.jpg")).toBe(false);
    expect(isWixMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isWixMediaUrl("data:image/png;base64,AAAA")).toBe(false);
  });

  it("rejects junk", () => {
    expect(isWixMediaUrl(null)).toBe(false);
    expect(isWixMediaUrl("")).toBe(false);
    expect(isWixMediaUrl("not a url")).toBe(false);
    expect(isWixMediaUrl(`https://static.wixstatic.com/${"x".repeat(600)}`)).toBe(false);
  });
});
