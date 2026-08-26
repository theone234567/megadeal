import type { Deal } from "./types";

export type SortOption = "ending" | "discount" | "priceAsc" | "priceDesc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "ending", label: "Ending soonest" },
  { value: "discount", label: "Biggest discount" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
];

export function sortDeals(deals: Deal[], sort: SortOption): Deal[] {
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
