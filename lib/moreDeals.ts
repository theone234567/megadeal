import type { Deal } from "./types";

/**
 * The two lists under a deal (app/deal/[slug]/MoreDeals.tsx): this
 * business's other deals, then "You might also like".
 *
 * - Same business first, up to 8: someone who liked this deal is often more
 *   interested in this business's other offers. Sold-out ones stay in,
 *   last (the listing already orders them so).
 * - Then up to 4 same-category deals from other businesses (any category
 *   if there are none), never one already shown above, and never one
 *   that's sold out (T252): a suggestion should be something you can get.
 */
export function moreDealsFor(deal: Pick<Deal, "id" | "businessSlug" | "categories">, allDeals: Deal[]) {
  const others = allDeals.filter((d) => d.id !== deal.id);
  const fromBusiness = deal.businessSlug ? others.filter((d) => d.businessSlug === deal.businessSlug).slice(0, 8) : [];
  const shown = new Set(fromBusiness.map((d) => d.id));
  const candidates = others.filter((d) => !shown.has(d.id) && d.inStock !== false);
  const sameCategory = candidates.filter((d) => d.categories.some((c) => deal.categories.includes(c)));
  const related = (sameCategory.length > 0 ? sameCategory : candidates).slice(0, 4);
  return { fromBusiness, related };
}
