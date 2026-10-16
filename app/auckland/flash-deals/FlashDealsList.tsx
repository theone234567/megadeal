"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import { useWithTestDeals } from "@/lib/useTestDeals";
import { sortDeals, type SortOption } from "@/lib/sortDeals";
import { useUserLocation } from "@/lib/geo";
import DealGrid from "@/components/DealGrid";
import SortSelect from "@/components/SortSelect";
import NearMeStatus from "@/components/NearMeStatus";
import ViewToggle, { type DealsView } from "@/components/ViewToggle";

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
export default function FlashDealsList({ initialDeals, testDeals = false }: { initialDeals: Deal[]; testDeals?: boolean }) {
  const [sort, setSort] = useState<SortOption>("ending");
  const [view, setView] = useState<DealsView>("grid");
  const [now, setNow] = useState(() => Date.now());
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation();

  // Only prompt for location once "Nearest to me" is actually picked.
  useEffect(() => {
    if (sort === "nearest" && locationStatus === "idle") requestLocation();
  }, [sort, locationStatus, requestLocation]);

  // Re-check every 30s so a flash deal that expires while the page is open
  // drops out of the list on its own, matching the homepage section.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const allDeals = useWithTestDeals(initialDeals, testDeals);
  const flash = allDeals.filter((d) => d.isFlash && isDealLive(d, now));
  const sorted = sortDeals(flash, sort, coords);
  const emptyMessage = "No flash deals right now — check back soon, they come and go fast!";

  return (
    <>
      {/* The page's only other heading is the H1 ("Flash Deals") — this
          fills the H1->H3 gap before DealGrid's per-card <h3>s. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-hp-ink">Live flash deals</h2>
        {flash.length > 0 && (
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
        <DealGrid deals={sorted} emptyMessage={emptyMessage} userLocation={coords} priorityCount={2} />
      )}
    </>
  );
}
