import type { Deal } from "./types";
import { haversineDistanceKm, type Coords } from "./geo";

export type SortOption = "recommended" | "ending" | "discount" | "priceAsc" | "priceDesc" | "nearest";

/** The category and flash-deal pages' sorts. */
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "ending", label: "Ending soon" },
  { value: "discount", label: "Biggest discount" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "nearest", label: "📍 Nearest to me" },
];

/** The homepage's sorts: "Recommended" (every category taking turns, see
 *  `mixCategories`) first, as its default, then the rest. */
export const HOME_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  ...SORT_OPTIONS,
];

/** Distance from the user to a deal's business, in km — null if either side
 * of the calculation is missing (no user location yet, or this merchant
 * never got geocoded). Used both for "nearest" sorting and the on-card badge. */
export function dealDistanceKm(deal: Deal, userLocation: Coords | null): number | null {
  if (!userLocation || deal.businessLat === null || deal.businessLng === null) return null;
  return haversineDistanceKm(userLocation, { lat: deal.businessLat, lng: deal.businessLng });
}

/** Sold-out deals after the ones people can still get, each group in the
 *  order it was in. A sold-out deal stays listed (it may come back), just
 *  never ahead of an available one. */
export function soldOutLast<T extends Pick<Deal, "inStock">>(deals: T[]): T[] {
  return [...deals.filter((d) => d.inStock !== false), ...deals.filter((d) => d.inStock === false)];
}

const endsAt = (d: Deal) => (d.expiresAt ? new Date(d.expiresAt).getTime() : Infinity);

/**
 * Every category taking turns, so the first screen of deals shows each
 * category with something live rather than whichever one has the most
 * deals or the shortest ones. Each round takes the next deal from every
 * category, soonest-ending first within the round, so Flash Deals still
 * come early. A deal counts under its first category.
 */
export function mixCategories(deals: Deal[]): Deal[] {
  const groups = new Map<string, Deal[]>();
  for (const d of [...deals].sort((a, b) => endsAt(a) - endsAt(b))) {
    const key = d.categories?.[0] ?? "";
    const group = groups.get(key);
    if (group) group.push(d);
    else groups.set(key, [d]);
  }
  const mixed: Deal[] = [];
  for (let round = 0; mixed.length < deals.length; round++) {
    const heads = [...groups.values()].flatMap((g) => (g[round] ? [g[round]] : []));
    mixed.push(...heads.sort((a, b) => endsAt(a) - endsAt(b)));
  }
  return mixed;
}

export function sortDeals(deals: Deal[], sort: SortOption, userLocation: Coords | null = null): Deal[] {
  if (sort === "recommended") {
    // Mixed separately, so a sold-out deal never takes its category's turn.
    const [available, soldOut] = [deals.filter((d) => d.inStock !== false), deals.filter((d) => d.inStock === false)];
    return [...mixCategories(available), ...mixCategories(soldOut)];
  }
  const sorted = [...deals];
  switch (sort) {
    case "priceAsc":
      sorted.sort((a, b) => a.now - b.now);
      break;
    case "priceDesc":
      sorted.sort((a, b) => b.now - a.now);
      break;
    case "discount":
      sorted.sort((a, b) => b.discountPercent - a.discountPercent);
      break;
    case "nearest":
      // Deals with no distance available (no location yet, or an ungeocoded
      // merchant) sort to the end rather than dropping out of the grid.
      sorted.sort((a, b) => {
        const da = dealDistanceKm(a, userLocation) ?? Infinity;
        const db = dealDistanceKm(b, userLocation) ?? Infinity;
        return da - db;
      });
      break;
    case "ending":
    default:
      sorted.sort((a, b) => endsAt(a) - endsAt(b));
      break;
  }
  return soldOutLast(sorted);
}
