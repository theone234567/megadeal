"use client";

import { useEffect, useState } from "react";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";

export default function CategoryDeals({ category }: { category: string }) {
  const [deals, setDeals] = useState<Deal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    fetchDeals(getPublicWixClient()).then((result) => {
      if (!cancelled) setDeals(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  if (!deals) return <DealGridSkeleton />;

  const filtered = deals.filter((d) => d.categories.includes(category));

  return (
    <DealGrid
      deals={filtered}
      emptyMessage={`No deals in ${category} right now — check back soon!`}
    />
  );
}
