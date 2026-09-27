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
      <div className="rounded-2xl border border-dashed border-hp-line bg-white px-6 py-14 text-center text-hp-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    // Phones: as many ~9.5rem columns as fit — two on most phones, one on
    // a very narrow screen or with enlarged text (rem grows with the text).
    // Three on tablets, four on desktop.
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} distanceKm={dealDistanceKm(deal, userLocation)} />
      ))}
    </div>
  );
}
