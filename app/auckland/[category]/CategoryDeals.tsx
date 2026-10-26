"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import { useWithTestDeals } from "@/lib/useTestDeals";
import { sortDeals } from "@/lib/sortDeals";
import { useUrlSortView } from "@/lib/useUrlSortView";
import { useUserLocation } from "@/lib/geo";
import DealGrid from "@/components/DealGrid";
import SortSelect from "@/components/SortSelect";
import NearMeStatus from "@/components/NearMeStatus";
import ViewToggle from "@/components/ViewToggle";

const DealsMap = dynamic(() => import("@/components/DealsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-hp-line bg-white text-sm text-hp-muted">
      Loading map…
    </div>
  ),
});

// Deals are fetched server-side (see page.tsx) so listings are present in
// the raw HTML on first load. This component only filters/sorts on top.
/** Deals shown before "Show more", and how many each press adds. */
const PAGE = 24;

export default function CategoryDeals({
  category,
  initialDeals,
  testDeals = false,
}: {
  category: string;
  initialDeals: Deal[];
  /** Add the admin's test deals (pre-launch previews only). */
  testDeals?: boolean;
}) {
  const searchParams = useSearchParams();
  const city = (searchParams.get("city") ?? "").toLowerCase().trim();

  // In the address, so Back and shared links keep them (T252).
  const { sort, setSort, view, setView } = useUrlSortView("ending");
  const [now, setNow] = useState(() => Date.now());
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation();

  // Only prompt for location once "Nearest to me" is actually picked.
  useEffect(() => {
    if (sort === "nearest" && locationStatus === "idle") requestLocation();
  }, [sort, locationStatus, requestLocation]);

  // Re-check every 30s so a deal that expires while this page is open drops
  // out of the grid on its own, without requiring a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const allDeals = useWithTestDeals(initialDeals, testDeals);
  let filtered = allDeals.filter((d) => isDealLive(d, now) && d.categories.includes(category));
  if (city) {
    filtered = filtered.filter((d) => (d.businessCity ?? "").toLowerCase() === city);
  }

  const emptyMessage = city
    ? `No deals in ${category} in ${searchParams.get("city")} right now — check back soon!`
    : `No deals in ${category} right now — check back soon!`;

  const sorted = sortDeals(filtered, sort, coords);
  // A batch at a time: a busy category could have hundreds of deals.
  const [limit, setLimit] = useState(PAGE);

  return (
    <>
      {/* The page's only other heading is the H1 (the category name) — this
          fills the H1->H3 gap before DealGrid's per-card <h3>s. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-hp-ink">Live deals</h2>
        {filtered.length > 0 && (
          <div className="flex gap-2">
            <SortSelect value={sort} onChange={setSort} className="min-w-[6.5rem]" />
            <ViewToggle value={view} onChange={setView} />
          </div>
        )}
      </div>
      {sort === "nearest" && (
        <div className="flex justify-end">
          <NearMeStatus status={locationStatus} onRetry={requestLocation} />
        </div>
      )}
      {view === "map" ? (
        <DealsMap deals={sorted} userLocation={coords} />
      ) : (
        <>
          <DealGrid deals={sorted.slice(0, limit)} emptyMessage={emptyMessage} userLocation={coords} priorityCount={2} />
          {sorted.length > limit && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="flex min-h-[48px] w-full items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-white px-6 text-[0.9375rem] font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto"
              >
                Show more deals ({sorted.length - limit} more)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
