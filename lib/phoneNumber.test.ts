import { describe, expect, it } from "vitest";
import { phoneE164 } from "./phoneNumber";
import { isSafeOptionalUrl, safeWebHref } from "./socialLinks";
import { phoneLink } from "./booking";

describe("phone numbers (security pack T140)", () => {
  it("takes real NZ numbers, however they're written, as E.164", () => {
    expect(phoneE164("09 123 4567")).toBe("+6491234567");
    expect(phoneE164("(09) 123-4567")).toBe("+6491234567");
    expect(phoneE164("021 123 456")).toBe("+6421123456");
    expect(phoneE164("027 123 4567")).toBe("+64271234567");
    expect(phoneE164("+64 21 555 1234")).toBe("+64215551234");
    expect(phoneE164("+64 (0)9 123 4567")).toBe("+6491234567");
    expect(phoneE164("0064 9 123 4567")).toBe("+6491234567");
    expect(phoneE164("0800 123 456")).toBe("+64800123456");
    expect(phoneE164("+61 2 9876 5432")).toBe("+61298765432"); // Australia
  });

  it("refuses junk", () => {
    for (const bad of ["abc", "12", "1234567", "0800 MEGADEAL", "09 123", "+64 5 123 4567", "tel:091234567", "javascript:alert(1)", "", "  "]) {
      expect(phoneE164(bad), bad).toBeNull();
      expect(phoneLink(bad), bad).toBeNull();
    }
  });
});

describe("web links (security pack T140)", () => {
  it("refuses other schemes, hosts without a domain, and odd characters", () => {
    for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd", "example", "localhost:3000", "http://192.168.1.1", "javascript&colon;alert(1)", "https://exa mple.com"]) {
      expect(isSafeOptionalUrl(bad.trim()), bad).toBe(false);
      expect(safeWebHref(bad), bad).toBeNull();
    }
  });

  it("takes real addresses, adding https:// when it's left off", () => {
    expect(isSafeOptionalUrl("yourcafe.co.nz")).toBe(true);
    expect(safeWebHref("yourcafe.co.nz")).toBe("https://yourcafe.co.nz/");
    expect(safeWebHref("http://book.yourcafe.co.nz/now?x=1")).toBe("http://book.yourcafe.co.nz/now?x=1");
    expect(safeWebHref("https://xn--mtai-xqa.nz")).toBe("https://xn--mtai-xqa.nz/");
    expect(safeWebHref("māori.nz")).toMatch(/^https:\/\/xn--/);
  });
});
