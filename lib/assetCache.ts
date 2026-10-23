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
 * Auckland pages, which list live deals, for a minute, the same as the
 * deal listing's own cache; the homepage for five minutes, since it's
 * where most visits start and on a quiet site a one-minute copy has
 * usually expired before the next visitor (owner's choice, 19 Oct 2026),
 * so a newly approved deal can take up to five minutes to show there. Each copy belongs to one
 * deploy (`version`), so a new deploy never serves a page pointing at
 * scripts that are gone.
 */
const FIXED_PAGES = new Set([
  "/about", "/careers", "/contact", "/developers", "/help", "/how-it-works", "/list-your-business",
  "/privacy", "/redeem", "/refund-policy", "/terms", "/llms.txt", "/llms-full.txt", "/robots.txt", "/feed/openapi.json",
  "/advertise/restaurants", "/advertise/beauty-spa", "/advertise/home-car", "/advertise/things-to-do",
  "/advertise/travel-getaways", "/advertise/health-fitness",
]);
const LISTING_PAGES = /^\/(?:auckland(?:\/[a-z-]+)?)?$/;

/** How long a page may be served from the edge, in seconds, or 0 for never. */
export function pageEdgeSeconds(pathname: string): number {
  if (FIXED_PAGES.has(pathname)) return 60 * 60;
  if (pathname === "/") return 5 * 60;
  if (LISTING_PAGES.test(pathname)) return 60;
  return 0;
}

/** Signed in (admin or business): the pages can differ, so never shared. */
const SIGNED_IN = /(?:^|;\s*)(?:admin_session|md_access|md_refresh)=/;
/** Next's in-page navigation asks for a different form of the same page. */
const NEXT_NAVIGATION = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch"];

/**
 * That different form, when it can be kept like the page: Next's request
 * for a page's data (`RSC: 1`) carries `?_rsc=`, a fingerprint of every
 * request header the answer depends on (the router state, prefetch,
 * segment and the page asking), so one address is one answer. These were
 * rendered afresh every time, and a computer's view of any page sends
 * several as it prefetches the links on screen: under Cloudflare's CPU
 * limit about one in eighty was refused (503, 21 Oct 2026). Only `_rsc`
 * may be in the query, so nothing else can vary the answer.
 */
function prefetchFingerprint(req: Request, url: URL): string | null {
  const fingerprint = url.searchParams.get("_rsc");
  if (req.headers.get("rsc") !== "1" || !fingerprint || [...url.searchParams.keys()].length !== 1) return null;
  return fingerprint;
}
const BROWSER_CACHE_HEADER = "x-md-browser-cache-control";

/**
 * Ad and campaign tags that don't change the page: every click from an ad
 * carries some (?fbclid=…, ?gclid=…, ?utm_source=…), and any query used to
 * send the visit past the edge copy, so paid visitors were the ones always
 * waiting for a fresh render, and the ones Cloudflare's CPU limit could
 * refuse. The tags are read in the browser from its own address bar
 * (lib/attribution.ts), never from the page, so the page is the same with
 * or without them. Anything else in the query still skips the copy.
 */
const TRACKING_PARAM = /^(?:utm_[a-z_]+|fbclid|gclid|gbraid|wbraid|dclid|msclkid|ttclid|twclid|li_fat_id|igshid|mc_cid|mc_eid|_gl)$/i;

/** The address with the ad tags taken off, or null if there were none. */
export function withoutTrackingParams(url: URL): URL | null {
  const keys = [...url.searchParams.keys()];
  if (!keys.some((k) => TRACKING_PARAM.test(k))) return null;
  const clean = new URL(url);
  for (const k of keys) if (TRACKING_PARAM.test(k)) clean.searchParams.delete(k);
  return clean;
}

export async function withPageEdgeCache(
  req: Request,
  ctx: { waitUntil(p: Promise<unknown>): void },
  cache: EdgeCache | undefined,
  version: string | undefined,
  handle: (req: Request) => Promise<Response>
): Promise<Response> {
  const asked = new URL(req.url);
  const seconds = pageEdgeSeconds(asked.pathname);
  // An ad click on a page kept at the edge is that page without its tags,
  // rendered and kept without them too, so one visitor's click id is never
  // in another's copy. Other pages are left exactly as asked for.
  const untagged = seconds && req.method === "GET" ? withoutTrackingParams(asked) : null;
  const url = untagged ?? asked;
  if (untagged) req = new Request(untagged.toString(), req);
  const prefetch = prefetchFingerprint(req, url);
  if (
    !cache ||
    !version ||
    !seconds ||
    req.method !== "GET" ||
    (url.search && !prefetch) ||
    SIGNED_IN.test(req.headers.get("cookie") ?? "") ||
    (!prefetch && NEXT_NAVIGATION.some((h) => req.headers.has(h)))
  ) {
    return handle(req);
  }

  const key = new Request(
    `${url.origin}${url.pathname}?v=${encodeURIComponent(version)}${prefetch ? `&_rsc=${encodeURIComponent(prefetch)}` : ""}`,
    { method: "GET" }
  );
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
    (prefetch ? /^text\/x-component/ : /^(?:text\/html|text\/plain|application\/json)/).test(type)
  ) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set(BROWSER_CACHE_HEADER, browserCache || "no-cache, must-revalidate");
    copy.headers.set("Cache-Control", `public, max-age=${seconds}`);
    ctx.waitUntil(cache.put(key, copy).catch(() => {}));
  }
  return res;
}

/** Share images, icons and the favicon that Next draws at build time. */
export const PREBUILT_PATH = /(?:^|\/)(?:opengraph-image|twitter-image)$|^\/(?:apple-)?icon\.png$|^\/favicon\.ico$/;

interface AssetFetcher {
  fetch(req: Request): Promise<Response>;
}

/**
 * Answers a share image or icon with the copy drawn at build time
 * (scripts/prebuilt-images.mjs puts them in the Worker's static assets),
 * so it's never drawn on a visit. Drawing a PNG is the heaviest work the
 * site does, and on Cloudflare's CPU limit it sometimes failed: Search
 * Console reported /opengraph-image as a server error (Oct 2026). Anything
 * without a copy (a deal's own share image) goes on to `handle`.
 */
export async function withPrebuiltImage(
  req: Request,
  assets: AssetFetcher | undefined,
  handle: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  if (!assets || (req.method !== "GET" && req.method !== "HEAD") || !PREBUILT_PATH.test(url.pathname)) return handle(req);
  const file = /\.(?:png|ico)$/.test(url.pathname) ? url.pathname : `${url.pathname}.png`;
  const found = await assets.fetch(new Request(new URL(`/cdn-cgi/_prebuilt${file}`, url.origin))).catch(() => undefined);
  if (!found || found.status !== 200) {
    await found?.body?.cancel().catch(() => {});
    return handle(req);
  }
  const res = new Response(req.method === "HEAD" ? null : found.body, { status: 200 });
  res.headers.set("Content-Type", file.endsWith(".ico") ? "image/x-icon" : "image/png");
  res.headers.set("Cache-Control", `public, max-age=${ONE_DAY}`);
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Shows in a response which copy answered (checking a deploy).
  res.headers.set("X-MegaDeal-Image", "prebuilt");
  return res;
}
