/**
 * Keeps a copy of the site's share images and icons in Cloudflare's edge
 * cache for a day (worker.mjs), so each is drawn once per data centre a
 * day rather than on every request.
 *
 * Why: the OpenNext adapter runs with its default cache, which keeps
 * nothing, so even a page built ahead of time is rendered again on every
 * request. For a share image that means drawing a PNG (fonts, layout,
 * rasterising) each time; Search Console saw /opengraph-image answer with
 * a server error (Sept 2026). They only change with a deploy, and the
 * pages that link to them add a content hash to the address, so a day's
 * copy is never wrong for long.
 *
 * No imports: worker.mjs is bundled by wrangler, outside Next.
 */

/** Share images (opengraph-image, twitter-image, at any depth) and icons. */
export const EDGE_CACHED_PATH = /(?:^|\/)(?:opengraph-image|twitter-image)(?:-[\w-]+)?$|^\/(?:apple-)?icon\.png$/;

const ONE_DAY = 60 * 60 * 24;

interface EdgeCache {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, response: Response): Promise<void>;
}

export async function withEdgeCache(
  req: Request,
  ctx: { waitUntil(p: Promise<unknown>): void },
  cache: EdgeCache | undefined,
  handle: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  if (!cache || req.method !== "GET" || !EDGE_CACHED_PATH.test(url.pathname)) return handle(req);

  // The address alone (with its query, the content hash): no cookies or
  // other headers, so every visitor shares the one copy.
  const key = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return hit;

  const res = await handle(req);
  if (res.status === 200) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set("Cache-Control", `public, max-age=${ONE_DAY}`);
    copy.headers.delete("Set-Cookie");
    ctx.waitUntil(cache.put(key, copy).catch(() => {}));
  }
  return res;
}

/**
 * Public pages that are the same for every visitor, kept at the edge so
 * most visits never reach the Next server (worker.mjs). Each Next render
 * costs CPU, and the Worker is refused by Cloudflare (error 1102) when one
 * request uses too much: about one visit in six failed that way, with
 * Search Console reporting a server error (audit of 19 Oct 2026).
 *
 * The fixed pages (built once per deploy) are kept for an hour; the
 * homepage and the Auckland pages, which list live deals, for a minute,
 * the same as the deal listing's own cache. Each copy belongs to one
 * deploy (`version`), so a new deploy never serves a page pointing at
 * scripts that are gone.
 */
const FIXED_PAGES = new Set([
  "/about", "/careers", "/contact", "/developers", "/help", "/how-it-works", "/list-your-business",
  "/privacy", "/redeem", "/refund-policy", "/terms", "/llms.txt", "/robots.txt", "/feed/openapi.json",
  "/advertise/restaurants", "/advertise/beauty-spa", "/advertise/home-car", "/advertise/things-to-do",
  "/advertise/travel-getaways", "/advertise/health-fitness",
]);
const LISTING_PAGES = /^\/(?:auckland(?:\/[a-z-]+)?)?$/;

/** How long a page may be served from the edge, in seconds, or 0 for never. */
export function pageEdgeSeconds(pathname: string): number {
  if (FIXED_PAGES.has(pathname)) return 60 * 60;
  if (LISTING_PAGES.test(pathname)) return 60;
  return 0;
}

/** Signed in (admin or business): the pages can differ, so never shared. */
const SIGNED_IN = /(?:^|;\s*)(?:admin_session|md_access|md_refresh)=/;
/** Next's in-page navigation asks for a different form of the same page. */
const NEXT_NAVIGATION = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch"];
const BROWSER_CACHE_HEADER = "x-md-browser-cache-control";

export async function withPageEdgeCache(
  req: Request,
  ctx: { waitUntil(p: Promise<unknown>): void },
  cache: EdgeCache | undefined,
  version: string | undefined,
  handle: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  const seconds = pageEdgeSeconds(url.pathname);
  if (
    !cache ||
    !version ||
    !seconds ||
    req.method !== "GET" ||
    url.search ||
    SIGNED_IN.test(req.headers.get("cookie") ?? "") ||
    NEXT_NAVIGATION.some((h) => req.headers.has(h))
  ) {
    return handle(req);
  }

  const key = new Request(`${url.origin}${url.pathname}?v=${encodeURIComponent(version)}`, { method: "GET" });
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) {
    // As the page itself would have answered, for the browser.
    const res = new Response(hit.body, hit);
    res.headers.set("Cache-Control", res.headers.get(BROWSER_CACHE_HEADER) ?? "no-cache, must-revalidate");
    res.headers.delete(BROWSER_CACHE_HEADER);
    return res;
  }

  const res = await handle(req);
  const browserCache = res.headers.get("cache-control") ?? "";
  const type = res.headers.get("content-type") ?? "";
  if (
    res.status === 200 &&
    !res.headers.has("set-cookie") &&
    !/private|no-store/i.test(browserCache) &&
    /^(?:text\/html|text\/plain|application\/json)/.test(type)
  ) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set(BROWSER_CACHE_HEADER, browserCache || "no-cache, must-revalidate");
    copy.headers.set("Cache-Control", `public, max-age=${seconds}`);
    ctx.waitUntil(cache.put(key, copy).catch(() => {}));
  }
  return res;
}
