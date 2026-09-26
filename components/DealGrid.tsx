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
    // One column on phones, two on tablets, three on desktop. Two-up on a
    // 390px phone left each card ~170px wide, too narrow for a readable
    // title, business line and price; four-up on desktop drops cards
    // below ~290px for the same reason.
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} distanceKm={dealDistanceKm(deal, userLocation)} />
      ))}
    </div>
  );
}
