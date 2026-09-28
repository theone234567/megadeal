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
 *
 * `format` is "jpg" for social-share images: WhatsApp and some other
 * link previewers don't show WebP.
 */
export function wixImageUrl(url: string, width: number, height: number, format: "webp" | "jpg" = "webp"): string {
  if (!isWixMediaUrl(url)) return url;
  return `${url}/v1/fill/w_${Math.round(width)},h_${Math.round(height)}/file.${format}`;
}

/**
 * The same Wix photo at several widths, one shape (width ÷ height =
 * `ratio`), as an <img srcSet>, so a phone downloads a size that fits it
 * rather than the desktop one. undefined for photos that aren't Wix media,
 * which can't be resized this way.
 *
 * Needed because next/image makes no srcset while images are unoptimized
 * (next.config.mjs), so every card fetched its 750px photo even on a
 * phone, where the card is under 200px wide.
 */
export function wixImageSrcSet(url: string, widths: number[], ratio: number): string | undefined {
  if (!isWixMediaUrl(url)) return undefined;
  return widths.map((w) => `${wixImageUrl(url, w, w / ratio)} ${w}w`).join(", ");
}
