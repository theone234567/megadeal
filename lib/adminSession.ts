import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getRateLimitKv } from "./rateLimit";

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
// Slightly longer than the session TTL: once this key expires, every token
// that could have been affected by it has already expired on its own too,
// so there's nothing left for it to protect against by then.
const REVOKED_BEFORE_TTL_SECONDS = SESSION_TTL_MS / 1000 + 60 * 60;
const REVOKED_BEFORE_KEY = "admin-session-revoked-before";

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Creates a signed "<issuedAt>.<expires>.<hmac>" token — opaque and
 *  tamper-evident. Carrying issuedAt (not just expires) is what lets
 *  verifyAdminSessionToken reject a token issued before the last
 *  "log out"/revocation, even though it isn't expired yet. */
export function createAdminSessionToken(): string {
  const issuedAt = Date.now();
  const expires = issuedAt + SESSION_TTL_MS;
  const payload = `${issuedAt}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifies a session token: valid signature, not expired, and — the part
 * that's new — issued after the last time a logout revoked every admin
 * session. That check needs a KV read, so this is async now; every caller
 * is already inside an async route handler.
 *
 * Before this, logging out only ever deleted the browser's cookie — the
 * token itself carried no server-side concept of a session to end, so a
 * copy of it captured before logout (a shared computer's history, a proxy
 * log, anything short of the signing secret leaking outright) kept working
 * for up to the full 12 hours regardless of clicking "log out". This closes
 * that gap with one shared timestamp instead of a session store per token.
 */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAtStr, expiresStr, sig] = parts;
  const issuedAt = Number(issuedAtStr);
  const expires = Number(expiresStr);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expires) || expires < Date.now()) {
    return false;
  }

  const payload = `${issuedAtStr}.${expiresStr}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const kv = await getRateLimitKv();
  if (kv) {
    const revokedBefore = Number(await kv.get(REVOKED_BEFORE_KEY));
    if (Number.isFinite(revokedBefore) && issuedAt < revokedBefore) return false;
  }
  return true;
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  return verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

/**
 * Invalidates every admin session issued before right now — called on
 * logout so a stolen/leaked token stops working immediately instead of
 * quietly remaining valid until it naturally expires. Fails open (does
 * nothing) if the KV binding isn't configured, same convention as the
 * rest of this file's KV usage — logout still clears the cookie either way.
 */
export async function revokeAllAdminSessions(): Promise<void> {
  const kv = await getRateLimitKv();
  if (!kv) return;
  await kv.put(REVOKED_BEFORE_KEY, String(Date.now()), {
    expirationTtl: REVOKED_BEFORE_TTL_SECONDS,
  });
}

/** Constant-time comparison for the admin password itself. */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
