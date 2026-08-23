import type { Deal } from "@/lib/types";
import DealCard from "./DealCard";

export default function DealGrid({
  deals,
  emptyMessage = "No deals found. Try a different search or category.",
}: {
  deals: Deal[];
  emptyMessage?: string;
}) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  );
}
