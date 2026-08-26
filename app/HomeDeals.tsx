"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import { sortDeals, type SortOption } from "@/lib/sortDeals";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";
import SortSelect from "@/components/SortSelect";

export default function HomeDeals() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();
  const city = (searchParams.get("city") ?? "").toLowerCase().trim();

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("ending");

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    fetchDeals(getPublicWixClient())
      .then((result) => {
        if (!cancelled) setDeals(result);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[HomeDeals] fetchDeals failed", err);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        Couldn&apos;t load deals right now. Please refresh the page.
      </p>
    );
  }

  if (!deals) {
    return <DealGridSkeleton />;
  }

  let filtered = query
    ? deals.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.categories.some((c) => c.toLowerCase().includes(query))
      )
    : deals;

  if (city) {
    filtered = filtered.filter((d) => (d.businessCity ?? "").toLowerCase() === city);
  }

  const heading = query
    ? `Results for “${searchParams.get("q")}”`
    : city
    ? `All deals in ${searchParams.get("city")}`
    : "All deals";

  const sorted = sortDeals(filtered, sort);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
        <SortSelect value={sort} onChange={setSort} />
      </div>
      <DealGrid deals={sorted} />
    </>
  );
}
