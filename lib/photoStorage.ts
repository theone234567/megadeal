import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Where uploaded photos go: MegaDeal's own Cloudflare R2 bucket (the
 * PHOTOS binding in wrangler.toml), served back from this site at
 * /media/<key> (app/media/[...key]).
 */

/** The few R2 calls used here. */
export interface PhotoBucket {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; httpEtag?: string; size: number } | null>;
  /** R2's metadata-only read; /api/health uses it to see the bucket answers. */
  head?(key: string): Promise<unknown | null>;
}

declare global {
  interface CloudflareEnv {
    PHOTOS?: PhotoBucket;
  }
}

export const MEDIA_PATH = "/media/";

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

/** A key that's new for every new image (so cached copies never go
 *  stale) and readable (the business or deal name it was uploaded for).
 *  With `contentId` (photoContentId), the same picture uploaded again for
 *  the same name gets the same key, so a form can tell it's already there;
 *  without, a random one. */
export function newPhotoKey(slug: string, ext: string, now = new Date(), contentId?: string): string {
  const random = crypto.getRandomValues(new Uint8Array(6));
  const suffix = contentId || Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  const month = now.toISOString().slice(0, 7);
  return `photos/${month}/${slug || "megadeal-photo"}-${suffix}.${ext}`;
}

/** Stores a photo and returns its address on this site. */
export async function putPhoto(bucket: PhotoBucket, key: string, bytes: Uint8Array, contentType: string, siteUrl: string): Promise<string> {
  await bucket.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
  return `${siteUrl.replace(/\/$/, "")}${MEDIA_PATH}${key}`;
}

/** The first 12 hex characters of the image's SHA-256: as unguessable as
 *  the random suffix without the picture itself, and the same for the same
 *  picture. Photos are never deleted by key, so two uploads sharing one is
 *  harmless (it's the same image). */
export async function photoContentId(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  return Array.from(digest.slice(0, 6), (b) => b.toString(16).padStart(2, "0")).join("");
}
