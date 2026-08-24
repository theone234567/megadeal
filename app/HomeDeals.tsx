"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import DealGrid from "@/components/DealGrid";
import DealGridSkeleton from "@/components/DealGridSkeleton";

export default function HomeDeals() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase().trim();

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    fetchDeals(getPublicWixClient())
      .then((result) => {
        if (cancelled) return;
        if (result.length === 0) {
          // Temporary on-page diagnostic (no DevTools needed): probe the
          // search endpoint directly and show exactly what came back, to
          // tell "genuinely no live deals" apart from a fetch issue.
          const client = getPublicWixClient();
          client
            .fetchWithAuth("https://www.wixapis.com/stores/v3/products/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ search: { cursorPaging: { limit: 100 } } }),
            })
            .then(async (res) => {
              const bodyText = await res.text().catch(() => "<unreadable>");
              if (!cancelled) {
                setDiagnostic(`probe status=${res.status} body=${bodyText.slice(0, 400)}`);
              }
            })
            .catch((probeErr) => {
              if (!cancelled) setDiagnostic(`probe threw: ${String(probeErr)}`);
            });
        }
        setDeals(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(true);
          setDiagnostic(`fetchDeals threw: ${String(err)}`);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div>
        <p className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          Couldn&apos;t load deals right now. Please refresh the page.
        </p>
        {diagnostic && (
          <pre className="mt-4 whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-4 text-xs text-lime-300">
            {diagnostic}
          </pre>
        )}
      </div>
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
      {diagnostic && (
        <pre className="mt-4 whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-4 text-xs text-lime-300">
          {diagnostic}
        </pre>
      )}
    </>
  );
}
