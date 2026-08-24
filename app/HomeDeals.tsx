"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWix } from "@/context/WixProvider";
import { fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";

export default function HomeDeals() {
  const { client } = useWix();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    fetchDeals(client)
      .then((result) => {
        if (cancelled) return;
        if (result.length === 0) {
          // Diagnostic only: helps tell "genuinely no live deals" apart
          // from a fetch/permissions issue returning an empty list.
          console.warn("[fetchDeals] resolved with 0 deals");
        }
        setDeals(result);
      })
      .catch((err) => {
        console.error("[fetchDeals] failed", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filtered = query
    ? deals.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.categories.some((c) => c.toLowerCase().includes(query))
      )
    : deals;

  return (
    <>
      <h2 className="mb-5 text-xl font-bold text-slate-900">
        {query ? `Results for “${query}”` : "Today's top deals"}
      </h2>
      <DealGrid deals={filtered} />
    </>
  );
}
