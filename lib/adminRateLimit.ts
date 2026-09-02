import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

export const ADMIN_MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 15 * 60;
// How long a failed-attempt count survives before resetting on its own —
// prevents attempts from three separate days ever adding up to a lockout.
const ATTEMPTS_WINDOW_SECONDS = 15 * 60;

// Minimal shape of the one KV method set this module needs, so we don't
// have to pull in @cloudflare/workers-types just for the ambient global.
interface MinimalKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    ADMIN_RATE_LIMIT_KV?: MinimalKVNamespace;
  }
}

/**
 * True IP-scoped admin login lockout, backed by the ADMIN_RATE_LIMIT_KV
 * namespace (see wrangler.toml) — unlike a cookie-based lockout, clearing
 * cookies or switching browsers on the same connection doesn't reset it.
 * If the KV binding isn't configured yet (local dev, or before the
 * namespace id is set in wrangler.toml), every check fails open so admin
 * login still works, it just isn't rate-limited.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function getKv(): Promise<MinimalKVNamespace | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.ADMIN_RATE_LIMIT_KV ?? null;
  } catch {
    return null;
  }
}

export interface IpLockoutStatus {
  locked: boolean;
  minutesLeft: number;
}

export async function checkIpLockout(ip: string): Promise<IpLockoutStatus> {
  const kv = await getKv();
  if (!kv || ip === "unknown") return { locked: false, minutesLeft: 0 };

  const raw = await kv.get(`admin-lock:${ip}`);
  if (!raw) return { locked: false, minutesLeft: 0 };
  const lockedUntil = Number(raw);
  if (!Number.isFinite(lockedUntil) || lockedUntil <= Date.now()) {
    return { locked: false, minutesLeft: 0 };
  }
  return { locked: true, minutesLeft: Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000)) };
}

export interface AdminLoginAttemptResult {
  locked: boolean;
  minutesLeft: number;
  /** Attempts left before lockout — only meaningful when not locked. */
  remaining: number;
}

export async function recordFailedIpAttempt(ip: string): Promise<AdminLoginAttemptResult> {
  const kv = await getKv();
  if (!kv || ip === "unknown") {
    return { locked: false, minutesLeft: 0, remaining: ADMIN_MAX_LOGIN_ATTEMPTS - 1 };
  }

  const attemptsKey = `admin-attempts:${ip}`;
  const count = (Number(await kv.get(attemptsKey)) || 0) + 1;

  if (count >= ADMIN_MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
    await kv.put(`admin-lock:${ip}`, String(lockedUntil), { expirationTtl: LOCKOUT_SECONDS });
    await kv.delete(attemptsKey);
    return { locked: true, minutesLeft: Math.ceil(LOCKOUT_SECONDS / 60), remaining: 0 };
  }

  await kv.put(attemptsKey, String(count), { expirationTtl: ATTEMPTS_WINDOW_SECONDS });
  return { locked: false, minutesLeft: 0, remaining: ADMIN_MAX_LOGIN_ATTEMPTS - count };
}

export async function clearIpAttempts(ip: string): Promise<void> {
  const kv = await getKv();
  if (!kv || ip === "unknown") return;
  await Promise.all([kv.delete(`admin-attempts:${ip}`), kv.delete(`admin-lock:${ip}`)]);
}
