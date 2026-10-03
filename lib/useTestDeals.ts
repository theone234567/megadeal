"use client";

import { useEffect, useState } from "react";
import type { Deal } from "./types";

/**
 * Adds the admin's running test deals (lib/testDeals.ts) to a listing, in
 * the browser, so cached pages never hold them. `enabled` is true only
 * before launch, when middleware.ts lets nobody but a signed-in admin
 * reach these pages; the request is admin-only anyway (401 otherwise, and
 * the list stays as it was).
 */
export function useWithTestDeals(deals: Deal[], enabled: boolean): Deal[] {
  const [tests, setTests] = useState<Deal[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/admin/test-deals?view=deals", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.deals)) setTests(data.deals as Deal[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return tests.length ? [...tests, ...deals] : deals;
}
