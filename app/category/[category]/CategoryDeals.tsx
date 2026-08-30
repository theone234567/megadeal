"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export default function CategoryDeals({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const city = (searchParams.get("city") ?? "").toLowerCase().trim();

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

  // Re-check every 30s so a deal that expires while this page is open drops
  // out of the grid on its own, without requiring a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    setError(false);
    fetchDeals(getPublicWixClient())
      .then((result) => {
        if (!cancelled) setDeals(result);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[CategoryDeals] fetchDeals failed", err);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  if (error) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        Couldn&apos;t load deals right now. Please refresh the page.
      </p>
    );
  }

  if (!deals) return <DealGridSkeleton />;

  let filtered = deals.filter((d) => isDealLive(d, now) && d.categories.includes(category));
  if (city) {
    filtered = filtered.filter((d) => (d.businessCity ?? "").toLowerCase() === city);
  }

  const emptyMessage = city
    ? `No deals in ${category} in ${searchParams.get("city")} right now — check back soon!`
    : `No deals in ${category} right now — check back soon!`;

  const sorted = sortDeals(filtered, sort, coords);

  return (
    <>
      {filtered.length > 0 && (
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
        <DealGrid deals={sorted} emptyMessage={emptyMessage} userLocation={coords} />
      )}
    </>
  );
}
