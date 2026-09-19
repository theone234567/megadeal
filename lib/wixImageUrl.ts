import { isWixMediaUrl } from "./photoUrl";

/**
 * Requests an appropriately sized, WebP-encoded version of a Wix Media
 * photo directly from Wix's own image CDN, instead of shipping whatever
 * resolution a phone camera originally uploaded (routinely several MB) to
 * every visitor regardless of how small the photo actually renders.
 *
 * This deliberately bypasses next/image's own optimizer/Cloudflare's IMAGES
 * binding — see the `unoptimized: true` comment in next.config.mjs: that
 * pipeline shipped blank images in production once already, and Wix's own
 * CDN (already serving every one of these URLs) is the more reliable place
 * to ask for a resize. Format documented at
 * https://dev.wix.com/docs/api-reference/assets/media/media-manager/url-image-transformation
 *
 * Non-Wix URLs (sample/placeholder photos from Unsplash/Pixabay, or
 * anything malformed) pass through unchanged — this only ever narrows what
 * a real Wix media URL asks for, never rewrites a host it doesn't recognize.
 */
export function wixImageUrl(url: string, width: number, height: number): string {
  if (!isWixMediaUrl(url)) return url;
  return `${url}/v1/fill/w_${Math.round(width)},h_${Math.round(height)}/file.webp`;
}
