"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import { sortDeals, type SortOption } from "@/lib/sortDeals";
import { useUserLocation } from "@/lib/geo";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";
import SortSelect from "@/components/SortSelect";
import NearMeStatus from "@/components/NearMeStatus";
import ViewToggle, { type DealsView } from "@/components/ViewToggle";

const DealsMap = dynamic(() => import("@/components/DealsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-100 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

export default function FlashDealsList() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("ending");
  const [view, setView] = useState<DealsView>("grid");
  const [now, setNow] = useState(() => Date.now());
  const { coords, status: locationStatus, request: requestLocation } = useUserLocation();

  // Only prompt for location once "Nearest to me" is actually picked.
  useEffect(() => {
    if (sort === "nearest" && locationStatus === "idle") requestLocation();
  }, [sort, locationStatus, requestLocation]);

  useEffect(() => {
    let cancelled = false;
    fetchDeals(getPublicWixClient())
      .then((result) => {
        if (!cancelled) setDeals(result);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[FlashDealsList] fetchDeals failed", err);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-check every 30s so a flash deal that expires while the page is open
  // drops out of the list on its own, matching the homepage section.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        Couldn&apos;t load deals right now. Please refresh the page.
      </p>
    );
  }

  if (!deals) return <DealGridSkeleton />;

  const flash = deals.filter((d) => d.isFlash && isDealLive(d, now));
  const sorted = sortDeals(flash, sort, coords);
  const emptyMessage = "No flash deals right now — check back soon, they come and go fast!";

  return (
    <>
      {flash.length > 0 && (
        <div className="mb-2 flex flex-wrap justify-end gap-2">
          <SortSelect value={sort} onChange={setSort} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      )}
      {sort === "nearest" && (
        <div className="flex justify-end">
          <NearMeStatus status={locationStatus} onRetry={requestLocation} />
        </div>
      )}
      {view === "map" ? (
        <DealsMap deals={sorted} userLocation={coords} />
      ) : (
        <DealGrid deals={sorted} emptyMessage={emptyMessage} />
      )}
    </>
  );
}
