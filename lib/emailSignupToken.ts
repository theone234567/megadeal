import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Signed confirm-link token for deal-alert signups — no database record
 * needed. The email + an expiry are HMAC-signed, so a valid link is proof
 * the recipient controls that inbox; the contact is only added to Resend's
 * Audience once this verifies, giving genuine double opt-in without
 * needing anywhere to store a "pending" record in between. Reuses
 * ADMIN_SESSION_SECRET rather than introducing another secret to configure.
 */
function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSignupConfirmToken(email: string): string {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${expires}.${email}`;
  return `${expires}.${sign(payload)}`;
}

export function verifySignupConfirmToken(email: string, token: string | undefined | null): boolean {
  if (!token || !email) return false;
  const [expiresStr, sig] = token.split(".");
  if (!expiresStr || !sig) return false;
  if (!Number.isFinite(Number(expiresStr)) || Number(expiresStr) < Date.now()) return false;

  const payload = `${expiresStr}.${email}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
