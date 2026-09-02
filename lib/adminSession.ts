import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export const ADMIN_ATTEMPTS_COOKIE_NAME = "admin_login_attempts";
export const MAX_ADMIN_LOGIN_ATTEMPTS = 3;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Creates a signed "<expiry>.<hmac>" token — opaque and tamper-evident. */
export function createAdminSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!Number.isFinite(Number(payload)) || Number(payload) < Date.now()) return false;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
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

interface AdminLoginAttempts {
  failedCount: number;
  lockedUntil: number; // 0 if not locked
}

/**
 * Tracks failed admin login attempts in a signed, httpOnly cookie — after
 * MAX_ADMIN_LOGIN_ATTEMPTS wrong passwords in a row, further attempts are
 * blocked for ADMIN_LOCKOUT_MS regardless of whether the password is now
 * correct. This is a per-browser lockout (clearing cookies resets it), not
 * a server-side/IP-wide rate limit — there's no persistent store wired up
 * for this deployment to key a lockout on IP address instead. It still
 * stops the common case (repeated guessing, or a naive script that doesn't
 * preserve cookies) without adding new infrastructure.
 */
export function readAdminLoginAttempts(token: string | undefined | null): AdminLoginAttempts {
  const fallback: AdminLoginAttempts = { failedCount: 0, lockedUntil: 0 };
  if (!token) return fallback;
  const [failedStr, lockedStr, sig] = token.split(".");
  if (!failedStr || !lockedStr || !sig) return fallback;
  if (!Number.isFinite(Number(failedStr)) || !Number.isFinite(Number(lockedStr))) return fallback;

  const payload = `${failedStr}.${lockedStr}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fallback;

  return { failedCount: Number(failedStr), lockedUntil: Number(lockedStr) };
}

export function createAdminLoginAttemptsToken(attempts: AdminLoginAttempts): string {
  const payload = `${attempts.failedCount}.${attempts.lockedUntil}`;
  return `${payload}.${sign(payload)}`;
}

/** Records one failed password attempt, locking out after the 3rd. */
export function recordFailedAdminLogin(current: AdminLoginAttempts): AdminLoginAttempts {
  const failedCount = current.failedCount + 1;
  if (failedCount >= MAX_ADMIN_LOGIN_ATTEMPTS) {
    return { failedCount: 0, lockedUntil: Date.now() + ADMIN_LOCKOUT_MS };
  }
  return { failedCount, lockedUntil: 0 };
}

export function isAdminLoginLocked(attempts: AdminLoginAttempts): boolean {
  return attempts.lockedUntil > Date.now();
}
