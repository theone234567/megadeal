import type { Metadata } from "next";

/**
 * The robots setting for every page search engines may index: large image
 * previews and full snippets for Google Search and Discover. The root
 * layout uses it, and so does each page that decides for itself whether
 * it's indexable, since a page's own `robots` replaces the layout's whole:
 * a page that set `undefined` when indexable lost these settings.
 */
export const INDEXABLE: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
};

/**
 * A listing page (/auckland and each /auckland/<category>) is shown to
 * search engines once it lists at least this many live deals. With one or
 * two it's mostly the page's template, and thin pages count against the
 * whole site (SEO pack T03, 22 Oct 2026). The page's robots and the
 * sitemap both ask hubIsIndexable, so they always agree.
 */
export const HUB_MIN_DEALS = 3;

export function hubIsIndexable(liveDeals: number): boolean {
  return liveDeals >= HUB_MIN_DEALS;
}
