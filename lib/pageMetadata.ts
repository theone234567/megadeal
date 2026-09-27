import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./siteConfig";

/**
 * Metadata for a plain content page (about, help, terms…).
 *
 * The root layout's openGraph block carries the homepage's title and
 * url, and a page that sets only title/description inherits it whole —
 * so a shared /how-it-works link showed the homepage's title and told
 * Facebook the page *was* the homepage. Giving every page its own
 * openGraph/twitter block fixes both — but a page's own openGraph block
 * also drops the inherited share image, so it names the site-wide one
 * (app/opengraph-image.tsx) itself.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = `${SITE_URL}${path}`;
  // title.template adds "| MegaDeal" to <title>; social titles aren't
  // run through it, so they carry the brand themselves.
  const socialTitle = `${title} | ${SITE_NAME}`;
  const image = { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: socialTitle, description, url, siteName: SITE_NAME, type: "website", locale: "en_NZ", images: [image] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [image.url] },
  };
}
