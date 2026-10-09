import { randomBytes } from "crypto";

/** Short, shareable referral code for a merchant to hand out, e.g. "MD1A2B3C". */
export function generateReferralCode(): string {
  return "MD" + randomBytes(3).toString("hex").toUpperCase();
}

/** Could this be a referral code? Loose on purpose (letters and digits,
 *  4–20 of them), so a code from before the "MD" format still checks. */
export function isReferralCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4,20}$/.test(code);
}
