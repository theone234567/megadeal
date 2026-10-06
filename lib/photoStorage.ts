import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dataBackend } from "./db/connection";

/**
 * Where uploaded photos go: Wix Media today; MegaDeal's own Cloudflare R2
 * bucket (the PHOTOS binding in wrangler.toml) once PHOTO_STORAGE=r2.
 * Served back from this site at /media/<key> (app/media/[...key]).
 *
 * R2 only together with the new database (DATA_BACKEND=postgres): while
 * deals are still Wix Stores products, a product's photo has to be a Wix
 * Media file.
 */

/** The few R2 calls used here. */
export interface PhotoBucket {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; httpEtag?: string; size: number } | null>;
}

declare global {
  interface CloudflareEnv {
    PHOTOS?: PhotoBucket;
  }
}

export const MEDIA_PATH = "/media/";

export function photoStorage(): "wix" | "r2" {
  return process.env.PHOTO_STORAGE === "r2" && dataBackend() === "postgres" ? "r2" : "wix";
}

export async function photoBucket(): Promise<PhotoBucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.PHOTOS ?? null;
  } catch {
    return null;
  }
}

/** The Cloudflare Images calls the /media route uses to make smaller copies. */
export interface PhotoResizer {
  input(stream: ReadableStream): {
    transform(t: { width: number; height: number; fit: "cover" }): {
      output(o: { format: string; quality: number }): Promise<{ image(): ReadableStream }>;
    };
  };
}

/** The IMAGES binding (wrangler.toml), or null away from Cloudflare. */
export async function photoResizer(): Promise<PhotoResizer | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env.IMAGES as unknown as PhotoResizer | undefined) ?? null;
  } catch {
    return null;
  }
}

/** A key that's new every time (so cached copies never go stale) and
 *  readable (the business or deal name it was uploaded for). */
export function newPhotoKey(slug: string, ext: string, now = new Date()): string {
  const random = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  const month = now.toISOString().slice(0, 7);
  return `photos/${month}/${slug || "megadeal-photo"}-${suffix}.${ext}`;
}

/** Stores a photo and returns its address on this site. */
export async function putPhoto(bucket: PhotoBucket, key: string, bytes: Uint8Array, contentType: string, siteUrl: string): Promise<string> {
  await bucket.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
  return `${siteUrl.replace(/\/$/, "")}${MEDIA_PATH}${key}`;
}
