import "server-only";
import { SITE_URL } from "./siteConfig";

/**
 * A small shared cache for server data, in Cloudflare's cache for the data
 * centre serving the request (the Workers Cache API, caches.default).
 *
 * The site runs as many short-lived copies at once, and a value kept in
 * one copy's memory doesn't help the others. This does: whichever copy
 * reads the deal listing from Wix stores it here, and every copy in the
 * same data centre can use it.
 *
 * Only ever read from server code. Entries are keyed by a URL on the site
 * (the Cache API needs one), but the Worker answers every request to the
 * site itself, so nothing stored here is ever served to a visitor.
 *
 * Does nothing where there's no Workers cache (local development, tests):
 * reads come back empty and writes are skipped.
 */
type Stored<T> = { at: number; value: T };

function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  return c ?? null;
}

const keyFor = (name: string) => `${SITE_URL}/__edge-cache/${name}`;

/** The stored value and when it was stored, or null. */
export async function readEdgeCache<T>(name: string): Promise<Stored<T> | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const res = await cache.match(keyFor(name));
    return res ? ((await res.json()) as Stored<T>) : null;
  } catch (err) {
    console.error("[edgeCache] read failed", name, err);
    return null;
  }
}

/** Stores a value for up to `keepSeconds`; callers judge freshness by `at`. */
export async function writeEdgeCache<T>(name: string, value: T, at: number, keepSeconds: number): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    const body: Stored<T> = { at, value };
    await cache.put(
      keyFor(name),
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${keepSeconds}` },
      })
    );
  } catch (err) {
    console.error("[edgeCache] write failed", name, err);
  }
}
