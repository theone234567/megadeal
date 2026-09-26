"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isDealLive } from "@/lib/dealVisibility";
import type { Deal } from "@/lib/types";
import DealCard from "./DealCard";
import { ZapIcon } from "./icons";

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
    // Pale lavender rather than the old deep-purple band: special enough
    // to set flash offers apart, without turning the whole page into a
    // marketing hero. No pulsing "Ending soon" pill — each card already
    // carries its own real "Offer ends in" deadline, and two urgency
    // signals per card just compete.
    <section aria-labelledby="flash-deals-heading" className="bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2
              id="flash-deals-heading"
              className="font-display flex items-center gap-2 text-2xl font-bold text-slate-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-white">
                <ZapIcon className="h-4 w-4" />
              </span>
              Flash Deals
            </h2>
            <p className="mt-1 text-sm text-slate-600">Short-notice offers, each with a real deadline.</p>
          </div>
          <Link
            href="/flash-deals"
            className="shrink-0 text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
          >
            See all →
          </Link>
        </div>
        {/* A horizontal row rather than a stretched grid — a flash section
            often only has 1-3 live deals, and a full grid made those few
            cards look oversized. Scrolled by hand only; nothing slides on
            its own. */}
        <div className="scrollbar-hide -mb-2 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
          {flash.map((deal) => (
            <div key={deal.id} className="w-[82%] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
              <DealCard deal={deal} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
