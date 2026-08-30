import type { Deal } from "@/lib/types";
import type { Coords } from "@/lib/geo";
import { dealDistanceKm } from "@/lib/sortDeals";
import DealCard from "./DealCard";

export default function DealGrid({
  deals,
  emptyMessage = "No deals found. Try a different search or category.",
  userLocation = null,
}: {
  deals: Deal[];
  emptyMessage?: string;
  /** When set, each card shows its distance from this point. */
  userLocation?: Coords | null;
}) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} distanceKm={dealDistanceKm(deal, userLocation)} />
      ))}
    </div>
  );
}
