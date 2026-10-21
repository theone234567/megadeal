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
