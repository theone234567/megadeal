"use client";

import { useEffect, useState } from "react";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import DealGrid from "./DealGrid";

/**
 * Short-burst "2-for-1 tonight only" style deals. Only rendered on the
 * homepage when at least one is currently live and unexpired — an empty
 * or all-expired flash section would just be dead space.
 */
export default function FlashDeals() {
  const [deals, setDeals] = useState<Deal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDeals(getPublicWixClient())
      .then((result) => {
        if (!cancelled) setDeals(result);
      })
      .catch(() => {
        if (!cancelled) setDeals([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!deals) return null;

  const now = Date.now();
  const flash = deals
    .filter((d) => d.isFlash && (!d.expiresAt || new Date(d.expiresAt).getTime() > now))
    .sort((a, b) => {
      const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return aExp - bExp;
    });

  if (flash.length === 0) return null;

  return (
    <div className="bg-brand-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-xl font-extrabold text-white">⚡ Flash Deals</h2>
          <span className="animate-pulse rounded-full bg-ember-500 px-2.5 py-0.5 text-xs font-bold text-white">
            Ending soon
          </span>
        </div>
        <DealGrid deals={flash} />
      </div>
    </div>
  );
}
