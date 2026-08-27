"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [now, setNow] = useState(() => Date.now());

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

  // Re-check every 30s so a flash deal that expires while the page is open
  // disappears on its own, without requiring a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!deals) return null;
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
        <DealGrid deals={flash} />
      </div>
    </div>
  );
}
