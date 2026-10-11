import { getCloudflareContext } from "@opennextjs/cloudflare";

// Cloudflare KV for the app (rate limits' fallback, the admin lockout,
// AI review status). Its own file so code that reaches the browser bundle
// can use it without pulling in the rate limiter's database side.
//
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

