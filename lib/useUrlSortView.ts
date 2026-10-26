"use client";

import { useEffect, useState } from "react";
import { SORT_OPTIONS, type SortOption } from "./sortDeals";
import type { DealsView } from "@/components/ViewToggle";

const SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value));

/**
 * A list page's sort and grid/map view, kept in the address (?sort=,
 * ?view=) so Back from a deal and a shared link keep them (T252). Changed
 * with replaceState: no reload, no extra history entry per click. The
 * default isn't written, so the plain address stays the canonical one (the
 * pages' canonical link never carries these).
 */
export function useUrlSortView(defaultSort: SortOption = "ending"): {
  sort: SortOption;
  setSort: (s: SortOption) => void;
  view: DealsView;
  setView: (v: DealsView) => void;
} {
  const [sort, setSortState] = useState<SortOption>(defaultSort);
  const [view, setViewState] = useState<DealsView>("grid");

  // Read after the first render, so the server's HTML and the browser's
  // first paint agree.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sort");
    const v = params.get("view");
    if (s && SORTS.has(s)) setSortState(s as SortOption);
    if (v === "map") setViewState("map");
  }, []);

  const write = (key: string, value: string, isDefault: boolean) => {
    const url = new URL(window.location.href);
    if (isDefault) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
    window.history.replaceState(window.history.state, "", url);
  };

  return {
    sort,
    setSort: (s) => {
      setSortState(s);
      write("sort", s, s === defaultSort);
    },
    view,
    setView: (v) => {
      setViewState(v);
      write("view", v, v === "grid");
    },
  };
}
