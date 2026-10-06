import { NextRequest } from "next/server";
import { photoBucket, photoResizer } from "@/lib/photoStorage";
import { PHOTO_SIZES } from "@/lib/photoUrl";

/**
 * Serves uploaded photos from MegaDeal's own storage (lib/photoStorage.ts)
 * at /media/photos/…. Each upload has a new name, so a copy is good for a
 * year anywhere it's cached. Images only, never sniffed as anything else.
 *
 * `?w=750&h=500&f=webp` asks for a smaller copy, cropped to fill (as Wix's
 * image service does for photos still there; lib/wixImageUrl.ts builds
 * these addresses). Only the sizes in PHOTO_SIZES are made, by Cloudflare
 * Images (the IMAGES binding), and each is kept in Cloudflare's cache so
 * it's made once. Anything else, and any failure to resize, gets the
 * original photo: a resize can't leave a page with a broken image.
 */
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const OUTPUT: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg" };

/** The resize asked for, if it's one the site makes. */
function requestedSize(params: URLSearchParams): { w: number; h: number; f: string } | null {
  const w = params.get("w");
  const h = params.get("h");
  const f = params.get("f") ?? "webp";
  if (!w || !h || !PHOTO_SIZES.has(`${w}x${h}`) || !OUTPUT[f]) return null;
  return { w: Number(w), h: Number(h), f };
}

/** Cloudflare's cache for this data centre; absent away from Cloudflare. */
function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return c?.default ?? null;
}

const headers = (type: string, etag?: string) => ({
  "Content-Type": type,
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  ...(etag ? { ETag: etag } : {}),
});

export async function GET(req: NextRequest, props: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await props.params;
  const key = parts.join("/");
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (!/^photos\/[0-9]{4}-[0-9]{2}\/[a-z0-9-]+\.[a-z]+$/.test(key) || !TYPES[ext]) return notFound();

  // Animated GIFs stay as they are.
  const size = ext === "gif" ? null : requestedSize(req.nextUrl.searchParams);
  const bucket = await photoBucket();
  if (!size) {
    const object = bucket ? await bucket.get(key) : null;
    if (!object) return notFound();
    return new Response(object.body, { headers: headers(TYPES[ext], object.httpEtag) });
  }

  // One address per size, whatever else is in the query.
  const cacheKey = new Request(`${req.nextUrl.origin}/media/${key}?w=${size.w}&h=${size.h}&f=${size.f}`);
  const cache = edgeCache();
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return hit;

  const object = bucket ? await bucket.get(key) : null;
  if (!object) return notFound();
  const original = await new Response(object.body).arrayBuffer();

  const resizer = await photoResizer();
  if (resizer) {
    try {
      const out = await resizer
        .input(new Response(original).body!)
        .transform({ width: size.w, height: size.h, fit: "cover" })
        .output({ format: OUTPUT[size.f], quality: 82 });
      const resized = await new Response(out.image()).arrayBuffer();
      if (resized.byteLength > 0) {
        const res = new Response(resized, { headers: headers(OUTPUT[size.f]) });
        await cache?.put(cacheKey, res.clone()).catch(() => undefined);
        return res;
      }
      console.error("[media] resize gave an empty image", key, size);
    } catch (err) {
      console.error("[media] resize failed", key, size, err);
    }
  }
  return new Response(original, { headers: headers(TYPES[ext], object.httpEtag) });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}
