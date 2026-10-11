import { describe, expect, it } from "vitest";
import { hideEmail, revealEmail } from "./hiddenEmail";

const EMAIL_IN_TEXT = /[^\s"'<>]+@[^\s"'<>]+\.[a-z]{2,}/i;

describe("booking emails kept out of the page's HTML", () => {
  it("round-trips, and the encoded form doesn't look like an email", () => {
    for (const email of ["bookings@cafe.co.nz", "Kia.Ora+deals@mātauranga.nz", "a@b.co"]) {
      const hidden = hideEmail(email)!;
      expect(hidden).not.toMatch(EMAIL_IN_TEXT);
      expect(hidden).not.toContain("@");
      expect(revealEmail(hidden)).toBe(email);
    }
  });

  it("passes nulls and plain (preview) addresses through, and refuses garbage", () => {
    expect(hideEmail(null)).toBeNull();
    expect(hideEmail("  ")).toBeNull();
    expect(revealEmail(null)).toBeNull();
    expect(revealEmail("plain@example.com")).toBe("plain@example.com");
    expect(revealEmail("h1:%%%not-base64")).toBeNull();
  });
});
