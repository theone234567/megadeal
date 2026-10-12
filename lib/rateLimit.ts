import type { NextRequest } from "next/server";
import { getRateLimitKv } from "./kvStore";

export { getRateLimitKv, type MinimalKVNamespace } from "./kvStore";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** The count in MegaDeal's own database (lib/securityStore.ts), or
 *  "unavailable" without one. Loaded only when needed, so the database
 *  module is never pulled in where there's no database. */
async function countInDatabase(key: string, windowSeconds: number): Promise<number | "unavailable"> {
  return (await import("./securityStore")).countInDatabase(key, windowSeconds);
}

/**
 * Simple fixed-window counter: increments `key` and reports whether it has
 * now exceeded `max` within `windowSeconds`. For public endpoints where
 * "too many requests" is the whole story (no lockout/strikes semantics
 * needed) — e.g. capping outbound email volume per IP or per recipient.
 * Fails open if the KV binding isn't configured, or for an unresolvable
 * ("unknown") caller identity — a request with no identifiable IP can't be
 * limited without also limiting everyone stuck behind the same fallback.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  /** For sign-in, sign-up and anything that sends email: when no count can
   *  be kept at all (database and KV both failing), refuse rather than let
   *  everything through. Without a KV binding (local development) it still
   *  lets requests through. */
  options: { failClosed?: boolean } = {},
): Promise<{ limited: boolean }> {
  const counted = await countInDatabase(key, windowSeconds);
  if (counted !== "unavailable") return { limited: counted > max };

  // Before the database update is applied, or if the database is
  // unreachable: Cloudflare KV, as before. It can't count in one step, so
  // it's the fallback, not the main store.
  const failed = { limited: options.failClosed === true };
  const kv = await getRateLimitKv();
  if (!kv) return { limited: false };

  const now = Date.now();
  // The window has a fixed end, stored with the count. Previously each
  // allowed request re-put the key with a fresh full TTL, so the window
  // slid forward on every call: a merchant making 61 saves spread across a
  // working day, never an hour apart, would be refused and then have to
  // sit completely idle for an hour to recover. A window that starts when
  // the first request lands and genuinely ends an hour later is what the
  // limits were chosen against.
  let count = 0;
  let resetAt = now + windowSeconds * 1000;

  // The limits guard against abuse; their bookkeeping failing (Cloudflare
  // KV down, or its daily write allowance used up on the free plan) must
  // not turn every sign-up, save and deal view into an error. So a failed
  // read or write lets the request through, once logged.
  let raw: string | null;
  try {
    raw = await kv.get(key);
  } catch (err) {
    console.error("[rateLimit] couldn't read the count", key.split(":")[0], err);
    return failed;
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.c === "number" && typeof parsed?.r === "number" && parsed.r > now) {
        count = parsed.c;
        resetAt = parsed.r;
      }
    } catch {
      // A value from before this format, or corrupt. Treated as a fresh
      // window rather than refusing the caller over unreadable bookkeeping.
    }
  }

  count += 1;
  if (count > max) return { limited: true };

  // TTL tracks the real remaining window, so the key disappears when the
  // window actually ends rather than being kept alive by traffic. At least
  // 60 seconds, KV's minimum (a shorter one made the write fail in a
  // window's last minute); the stored resetAt still ends it on time.
  const ttl = Math.max(60, Math.ceil((resetAt - now) / 1000));
  try {
    await kv.put(key, JSON.stringify({ c: count, r: resetAt }), { expirationTtl: ttl });
  } catch (err) {
    console.error("[rateLimit] couldn't save the count", key.split(":")[0], err);
    return failed;
  }
  return { limited: false };
}
