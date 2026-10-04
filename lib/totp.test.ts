import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, totpCode, totpUri, verifyTotp } from "./totp";

// RFC 6238 test secret ("12345678901234567890"), SHA-1.
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp", () => {
  it("matches the RFC 6238 test vectors (last 6 of the 8 digits)", () => {
    const key = Buffer.from("12345678901234567890");
    expect(totpCode(key, Math.floor(59 / 30))).toBe("287082");
    expect(totpCode(key, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(key, Math.floor(1234567890 / 30))).toBe("005924");
  });

  it("accepts the current code and one step either side, nothing further", () => {
    const now = 1234567890_000;
    expect(verifyTotp(SECRET, "005924", now)).toBe(Math.floor(1234567890 / 30));
    expect(verifyTotp(SECRET, "005924", now + 30_000)).not.toBeNull();
    expect(verifyTotp(SECRET, "005924", now + 90_000)).toBeNull();
    expect(verifyTotp(SECRET, "000000", now)).toBeNull();
    expect(verifyTotp(SECRET, "12345", now)).toBeNull();
    expect(verifyTotp("not base32!", "005924", now)).toBeNull();
  });

  it("round-trips base32 and makes 160-bit secrets", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s)?.length).toBe(20);
    expect(base32Decode("gezd gnbv")).toEqual(base32Decode("GEZDGNBV"));
  });

  it("builds the otpauth link apps understand", () => {
    expect(totpUri("ABC")).toBe("otpauth://totp/MegaDeal%3Aadmin?secret=ABC&issuer=MegaDeal&algorithm=SHA1&digits=6&period=30");
  });
});
