import type { Deal } from "@/lib/types";
import type { Coords } from "@/lib/geo";
import { dealDistanceKm } from "@/lib/sortDeals";
import DealCard from "./DealCard";

export default function DealGrid({
  deals,
  emptyMessage = "No deals found. Try a different search or category.",
  userLocation = null,
  priorityCount = 0,
}: {
  deals: Deal[];
  emptyMessage?: string;
  /** When set, each card shows its distance from this point. */
  userLocation?: Coords | null;
  /** The first cards' photos load straight away, ahead of everything
   *  else: the ones on screen when a listing opens. The rest load as
   *  they're scrolled to. */
  priorityCount?: number;
}) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hp-line bg-white px-6 py-14 text-center text-hp-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    // Below 768px: two columns, or one when half the width is under ~9.5rem
    // (a very narrow phone, or enlarged text, as rem grows with the text).
    // Three from 768px, four from 1200px.
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(9.5rem,calc((100%_-_0.75rem)/2))),1fr))] gap-3 md:grid-cols-3 md:gap-5 min-[1200px]:grid-cols-4 lg:gap-6">
      {deals.map((deal, i) => (
        <DealCard key={deal.id} deal={deal} distanceKm={dealDistanceKm(deal, userLocation)} priority={i < priorityCount} />
      ))}
    </div>
  );
}
