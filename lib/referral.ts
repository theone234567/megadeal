import { randomBytes } from "crypto";

// No 0/O, 1/I/L: the code is read aloud and typed in by hand.
const REFERRAL_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Short, shareable referral code for a merchant to hand out, e.g.
 *  "MD7K2QXA": 6 characters from 31 (about 890 million codes, T256; it was
 *  6 hex digits, 16.7 million). The database keeps codes unique, and a
 *  clash is retried with a new one (isReferralCodeClash). */
export function generateReferralCode(): string {
  const bytes = randomBytes(6);
  let code = "MD";
  for (const b of bytes) code += REFERRAL_CHARS[b % REFERRAL_CHARS.length];
  return code;
}

/** True when a save failed only because the referral code was taken. */
export function isReferralCodeClash(err: unknown): boolean {
  const text = String((err as { message?: string })?.message ?? err);
  return /referral_code/i.test(text) && /(unique|duplicate|23505)/i.test(text + String((err as { code?: string })?.code ?? ""));
}

/** Could this be a referral code? Loose on purpose (letters and digits,
 *  4–20 of them), so a code from before the "MD" format still checks. */
export function isReferralCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{4,20}$/.test(code);
}
