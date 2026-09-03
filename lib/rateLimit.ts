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

  const count = (Number(await kv.get(key)) || 0) + 1;
  if (count > max) return { limited: true };

  await kv.put(key, String(count), { expirationTtl: windowSeconds });
  return { limited: false };
}
