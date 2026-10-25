/**
 * Whether a business's public page goes to search engines (SEO pack
 * T232): one with a real offer, now or lately, and a finished profile.
 * Anything less is a name and maybe a phone number: a thin page that adds
 * nothing to a search result and counts against the site as a whole. It
 * stays reachable (old links, shares), noindex and out of the sitemap,
 * until it has one. Test businesses never get this far (they're never
 * public: lib/db/publicReads.ts PUBLIC_BUSINESS).
 */
export const MIN_BIO_FOR_INDEX = 120;
/** A deal that ended this many days ago still counts. */
export const RECENT_DEAL_DAYS = 90;

export function businessPageIndexable(b: {
  liveDeals: number;
  /** Deals that were live and ended in the last RECENT_DEAL_DAYS. */
  recentDeals: number;
  bio: string | null | undefined;
  photos: number;
  hasAddress: boolean;
}): boolean {
  return (b.liveDeals > 0 || b.recentDeals > 0) && b.photos > 0 && (b.bio ?? "").trim().length >= MIN_BIO_FOR_INDEX && b.hasAddress;
}
