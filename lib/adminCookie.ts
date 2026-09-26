/**
 * The admin session cookie's name and a Web Crypto check of its signature
 * and expiry, safe to run in middleware.ts.
 *
 * lib/adminSession.ts holds the full check every admin API route uses:
 * Node's crypto plus the KV "revoked before" list. Middleware can't rely
 * on Node's crypto, so this re-derives the same HMAC-SHA256 over
 * "<issuedAt>.<expires>" with Web Crypto. It deliberately skips the
 * revocation list — it only decides whether someone may *view* the
 * pre-launch customer pages, never whether they may take an admin action,
 * and a session expires within 12 hours regardless.
 */
export const ADMIN_COOKIE_NAME = "admin_session";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function hasValidAdminSignature(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, expires, sig] = parts;
  const expiresAt = Number(expires);
  if (!Number.isFinite(Number(issuedAt)) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }
  const sigBytes = hexToBytes(sig);
  if (!sigBytes) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  // verify() compares in constant time, unlike comparing hex strings.
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(`${issuedAt}.${expires}`));
}
