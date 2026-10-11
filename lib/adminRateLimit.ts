import { getRateLimitKv, getClientIp } from "@/lib/rateLimit";

export { getClientIp };

export const ADMIN_MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 15 * 60;
// How long a failed-attempt count survives before resetting on its own —
// prevents attempts from three separate days ever adding up to a lockout.
const ATTEMPTS_WINDOW_SECONDS = 15 * 60;

/**
 * True IP-scoped admin login lockout, backed by the shared RATE_LIMIT_KV
 * namespace (see lib/rateLimit.ts / wrangler.toml) — unlike a cookie-based
 * lockout, clearing cookies or switching browsers on the same connection
 * doesn't reset it. Uses its own lock/attempts keys rather than the
 * generic checkRateLimit() helper since a lockout (persist a "locked"
 * state past the window, reset early on a correct password) is different
 * shape from a plain fixed-window counter.
 */
export interface IpLockoutStatus {
  locked: boolean;
  minutesLeft: number;
}

/** The database side (lib/securityStore.ts), when there is a database:
 *  one statement per step, so parallel guesses can't share one count. */
async function store() {
  return process.env.DATA_BACKEND === "postgres" ? await import("./securityStore") : null;
}

export async function checkIpLockout(ip: string): Promise<IpLockoutStatus> {
  if (ip === "unknown") return { locked: false, minutesLeft: 0 };
  const left = await (await store())?.adminLockSecondsLeft(ip);
  if (typeof left === "number") {
    return left > 0 ? { locked: true, minutesLeft: Math.max(1, Math.ceil(left / 60)) } : { locked: false, minutesLeft: 0 };
  }
  const kv = await getRateLimitKv();
  if (!kv) return { locked: false, minutesLeft: 0 };

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
  if (ip !== "unknown") {
    const r = await (await store())?.recordAdminFailure(ip, ADMIN_MAX_LOGIN_ATTEMPTS, ATTEMPTS_WINDOW_SECONDS, LOCKOUT_SECONDS);
    if (r && r !== "unavailable") {
      return r.locked
        ? { locked: true, minutesLeft: Math.ceil(LOCKOUT_SECONDS / 60), remaining: 0 }
        : { locked: false, minutesLeft: 0, remaining: ADMIN_MAX_LOGIN_ATTEMPTS - r.count };
    }
  }
  const kv = await getRateLimitKv();
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
  if (ip !== "unknown") await (await store())?.clearAdminFailures(ip);
  const kv = await getRateLimitKv();
  if (!kv || ip === "unknown") return;
  await Promise.all([kv.delete(`admin-attempts:${ip}`), kv.delete(`admin-lock:${ip}`)]);
}
