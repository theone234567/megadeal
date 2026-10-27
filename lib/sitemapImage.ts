import { SITE_URL } from "./siteConfig";

/**
 * A deal photo's address as it goes in the sitemap: absolute, and with
 * "&" escaped, because Next.js writes image addresses into the XML as
 * they are (a photo URL with a query string would otherwise break the
 * whole sitemap). Only http(s) addresses; anything else is left out.
 */
export function sitemapImageUrl(photo: string | null): string | null {
  if (!photo) return null;
  let url: URL;
  try {
    url = new URL(photo, SITE_URL);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
