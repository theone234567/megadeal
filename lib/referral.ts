import { randomBytes } from "crypto";

/** Short, shareable referral code for a merchant to hand out, e.g. "MD1A2B3C". */
export function generateReferralCode(): string {
  return "MD" + randomBytes(3).toString("hex").toUpperCase();
}
