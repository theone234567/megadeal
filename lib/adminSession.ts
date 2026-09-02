import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

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
