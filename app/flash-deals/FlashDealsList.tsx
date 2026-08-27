"use client";

import { useEffect, useState } from "react";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import { sortDeals, type SortOption } from "@/lib/sortDeals";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";
import SortSelect from "@/components/SortSelect";

export default function FlashDealsList() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("ending");
  const [now, setNow] = useState(() => Date.now());

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
  const sorted = sortDeals(flash, sort);

  return (
    <>
      {flash.length > 0 && (
        <div className="mb-5 flex justify-end">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}
      <DealGrid
        deals={sorted}
        emptyMessage="No flash deals right now — check back soon, they come and go fast!"
      />
    </>
  );
}
