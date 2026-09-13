import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

// Minimal shape of the one KV method set this module needs, so we don't
// have to pull in @cloudflare/workers-types just for the ambient global.
export interface MinimalKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    // Shared namespace for every KV-backed rate limit in the app (admin
    // login lockout, public-endpoint abuse limits) — one binding, distinct
    // key prefixes per use, so a single namespace covers all of them.
    RATE_LIMIT_KV?: MinimalKVNamespace;
  }
}

/**
 * If the KV binding isn't configured yet (local dev, or before the
 * namespace id is set in wrangler.toml), every check fails open — the
 * request goes through unlimited rather than the feature breaking.
 */
export async function getRateLimitKv(): Promise<MinimalKVNamespace | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.RATE_LIMIT_KV ?? null;
  } catch {
    return null;
  }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
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
  windowSeconds: number
): Promise<{ limited: boolean }> {
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

  const raw = await kv.get(key);
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
  // window actually ends rather than being kept alive by traffic.
  const ttl = Math.max(1, Math.ceil((resetAt - now) / 1000));
  await kv.put(key, JSON.stringify({ c: count, r: resetAt }), { expirationTtl: ttl });
  return { limited: false };
}
