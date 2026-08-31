"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import { sortDeals, type SortOption } from "@/lib/sortDeals";
import { useUserLocation } from "@/lib/geo";
import DealGrid from "@/components/DealGrid";
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

// Deals are fetched server-side (see app/page.tsx) so the listings are
// present in the raw HTML on first load — both for crawlers that don't run
// JavaScript and to skip the loading-skeleton flash. This component only
// handles client-side filtering/sorting/interactivity on top of that data.
export default function HomeDeals({ initialDeals }: { initialDeals: Deal[] }) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();
  const city = (searchParams.get("city") ?? "").toLowerCase().trim();

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

  let filtered = initialDeals.filter((d) => isDealLive(d, now));
  filtered = query
    ? filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.categories.some((c) => c.toLowerCase().includes(query))
      )
    : filtered;

  if (city) {
    filtered = filtered.filter((d) => (d.businessCity ?? "").toLowerCase() === city);
  }

  const heading = query
    ? `Results for “${searchParams.get("q")}”`
    : city
    ? `All deals in ${searchParams.get("city")}`
    : sort === "nearest" && coords
    ? "Deals near you"
    : "All deals";

  const sorted = sortDeals(filtered, sort, coords);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SortSelect value={sort} onChange={setSort} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>
      {sort === "nearest" && (
        <NearMeStatus status={locationStatus} onRetry={requestLocation} />
      )}
      {view === "map" ? (
        <DealsMap deals={sorted} userLocation={coords} />
      ) : (
        <DealGrid deals={sorted} userLocation={coords} />
      )}
    </>
  );
}
