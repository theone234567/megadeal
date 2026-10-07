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
