import { CATEGORIES, categoryPath } from "./categories";
import { cityPath } from "./cities";

/**
 * How long an ended deal keeps its own page ("This deal ended on …",
 * noindex, with the business's other deals) before its address moves on.
 * Long enough for anyone who saved or shared the link to find out what
 * happened to it; after that the page only says something stale, while
 * search engines keep asking for it.
 */
export const ENDED_DEAL_PAGE_DAYS = 30;

/**
 * Where an ended deal's address sends visitors once its page has had its
 * 30 days: the business's own page while the business is listed, so a
 * shared link still leads to what's on there now; otherwise the deal's
 * category, or the city's deals. A permanent move, so search engines
 * carry any links the deal earned over to that page.
 *
 * null (keep the ended page) for a deal that hasn't ended, or ended less
 * than 30 days ago. A deal taken down before its end (paused, cancelled)
 * has no end in the past, and keeps its "not available right now" page.
 */
export function endedDealRedirect(
  deal: { expiresAt?: string | null; businessSlug?: string | null; categories?: string[] },
  businessListed: boolean,
  now: number = Date.now()
): string | null {
  const ended = deal.expiresAt ? Date.parse(deal.expiresAt) : NaN;
  if (!Number.isFinite(ended) || now - ended < ENDED_DEAL_PAGE_DAYS * 24 * 60 * 60 * 1000) return null;
  if (businessListed && deal.businessSlug) return `/business/${deal.businessSlug}`;
  const category = deal.categories?.find((c) => CATEGORIES.some((k) => k.name === c));
  return category ? categoryPath(category) : cityPath();
}
