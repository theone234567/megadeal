import type { Deal } from "./types";
import { haversineDistanceKm, type Coords } from "./geo";

export type SortOption = "ending" | "discount" | "priceAsc" | "priceDesc" | "nearest";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "ending", label: "Ending soon" },
  { value: "discount", label: "Biggest discount" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "nearest", label: "📍 Nearest to me" },
];

/** Distance from the user to a deal's business, in km — null if either side
 * of the calculation is missing (no user location yet, or this merchant
 * never got geocoded). Used both for "nearest" sorting and the on-card badge. */
export function dealDistanceKm(deal: Deal, userLocation: Coords | null): number | null {
  if (!userLocation || deal.businessLat === null || deal.businessLng === null) return null;
  return haversineDistanceKm(userLocation, { lat: deal.businessLat, lng: deal.businessLng });
}

export function sortDeals(deals: Deal[], sort: SortOption, userLocation: Coords | null = null): Deal[] {
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
      sorted.sort((a, b) => {
        const aTime = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bTime = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return aTime - bTime;
      });
      break;
  }
  return sorted;
}
