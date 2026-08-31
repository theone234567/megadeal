"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import DealCard from "./DealCard";

/**
 * Short-burst "2-for-1 tonight only" style deals. Only rendered on the
 * homepage when at least one is currently live and unexpired — an empty
 * or all-expired flash section would just be dead space. Deals come from
 * app/page.tsx's server-side fetch (present in the initial HTML for
 * crawlers and with no loading-state pop-in), not a client fetch here.
 */
export default function FlashDeals({ initialDeals }: { initialDeals: Deal[] }) {
  const [now, setNow] = useState(() => Date.now());

  // Re-check every 30s so a flash deal that expires while the page is open
  // disappears on its own, without requiring a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const flash = initialDeals
    .filter((d) => d.isFlash && isDealLive(d, now))
    .sort((a, b) => {
      const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return aExp - bExp;
    });

  if (flash.length === 0) return null;

  return (
    <div className="bg-brand-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/flash-deals" className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white hover:underline">⚡ Flash Deals</h2>
            <span className="animate-pulse rounded-full bg-ember-500 px-2.5 py-0.5 text-xs font-bold text-white">
              Ending soon
            </span>
          </Link>
          <Link
            href="/flash-deals"
            className="shrink-0 text-sm font-semibold text-brand-100 hover:text-white hover:underline"
          >
            See all →
          </Link>
        </div>
        {/* Fixed-width cards in a horizontal scroller rather than a
            stretched grid — a flash section often only has 1-3 live deals,
            and a full grid made those few cards look oversized. This also
            matches how "flash sale" rows read elsewhere (Amazon, Groupon):
            scan/swipe a short strip instead of the deals reflowing to fill
            whatever space is left. */}
        <div className="scrollbar-hide -mb-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-5">
          {flash.map((deal) => (
            <div key={deal.id} className="w-40 shrink-0 snap-start sm:w-48 md:w-56 lg:w-64">
              <DealCard deal={deal} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
