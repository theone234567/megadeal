/**
 * When each static page's content last really changed (from git history),
 * sent as <lastmod> in app/sitemap.ts so Google and Bing know which pages
 * to recrawl. Bump a page's date when you change its wording. Not the
 * build time: search engines ignore a lastmod that changes on every deploy.
 */
export const CONTENT_UPDATED: Record<string, string> = {
  "/coming-soon": "2026-10-05",
  "/list-your-business": "2026-10-05",
  "/advertise/restaurants": "2026-10-04",
  "/advertise/beauty-spa": "2026-10-05",
  "/advertise/home-car": "2026-10-05",
  "/advertise/things-to-do": "2026-10-05",
  "/how-it-works": "2026-10-03",
  "/redeem": "2026-10-03",
  "/help": "2026-10-05",
  "/about": "2026-09-27",
  "/contact": "2026-10-05",
  "/careers": "2026-09-27",
  "/terms": "2026-10-04",
  "/privacy": "2026-09-27",
  "/refund-policy": "2026-09-27",
};

/**
 * Pages whose own wording changes at launch: the offer (6 months, WELCOME6,
 * "before launch") becomes the launch offer, and "launching soon" becomes
 * "live". See docs/LAUNCH-OFFER-CHECKLIST.md. The footer banner changes on
 * every page, but a footer alone isn't worth a recrawl.
 */
export const CHANGES_AT_LAUNCH = new Set([
  "/list-your-business",
  "/advertise/restaurants",
  "/advertise/beauty-spa",
  "/advertise/home-car",
  "/advertise/things-to-do",
  "/how-it-works",
  "/about",
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The <lastmod> for a static page, or undefined for none. */
export function contentUpdated(path: string, launched: boolean, launchedOn: string): string | undefined {
  const updated = CONTENT_UPDATED[path];
  if (!updated) return undefined;
  if (launched && CHANGES_AT_LAUNCH.has(path) && DATE.test(launchedOn) && launchedOn > updated) return launchedOn;
  return updated;
}
