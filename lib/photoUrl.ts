/**
 * Validates that a photo URL is one actually issued by our own
 * /api/upload-photo route (a Wix Media Manager URL), not an arbitrary
 * client-supplied string — the server routes that accept a photoUrl only
 * ever expect the output of that upload flow.
 */
export function isWixMediaUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    // endsWith("wixstatic.com") alone also matches evil-wixstatic.com and
    // notwixstatic.com — any host an attacker can register. A merchant
    // could then point a deal or logo photo at a server they control and
    // have it served from our pages. The dot matters: either the domain
    // itself, or something genuinely beneath it.
    const host = parsed.hostname.toLowerCase();
    return host === "wixstatic.com" || host.endsWith(".wixstatic.com");
  } catch {
    return false;
  }
}

/** An uploaded photo stored by MegaDeal itself (lib/photoStorage.ts):
 *  https://<this site>/media/photos/… and nothing else. */
export function isOwnMediaUrl(url: unknown, siteUrl: string): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    const site = new URL(siteUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.host === site.host &&
      /^\/media\/photos\/[0-9]{4}-[0-9]{2}\/[a-z0-9-]+\.(?:jpeg|jpg|png|webp|gif)$/.test(parsed.pathname) &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

/**
 * A photo URL the site itself issued (/api/upload-photo): Wix Media, or
 * MegaDeal's own storage. What every route that accepts a photo checks.
 */
export function isUploadedPhotoUrl(url: unknown, siteUrl: string): url is string {
  return isWixMediaUrl(url) || isOwnMediaUrl(url, siteUrl);
}

/**
 * The sizes (width x height) the pages ask for: a photo in MegaDeal's own
 * storage is resized to these and nothing else (app/media/[...key]), so
 * no one can make the site produce and store endless variants. A size not
 * listed gets the original photo, never a broken one.
 */
export const PHOTO_SIZES: ReadonlySet<string> = new Set([
  "160x160", // business logo
  "360x240", "540x360", "750x500", // deal cards
  "480x360", "640x480", "900x675", "1200x900", // deal pages
  "600x600", // business gallery
  "800x600", // shop cards
  "1000x750", // AI deal review
  "1200x630", // share previews
]);
