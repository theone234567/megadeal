"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pushUrl, useUrlSearch } from "@/lib/useUrlSearch";
import { SearchIcon } from "@/components/icons";
import { PURPLE_HEADER } from "@/lib/brand";

/**
 * Navigates to the homepage with `patch` applied to its query string.
 * On the homepage itself every other filter (category, type, price…) is
 * kept and the URL changes without a server round trip — the results are
 * filtered in the browser from data already on the page. From any other
 * page it's an ordinary navigation.
 */
export function goHome(pathname: string | null, router: ReturnType<typeof useRouter>, patch: Record<string, string>) {
  const onHome = pathname === "/";
  const params = new URLSearchParams(onHome ? window.location.search : "");
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  const href = qs ? `/?${qs}` : "/";
  if (onHome) pushUrl(href);
  else router.push(href);
}

function SearchForm({ initial }: { initial: string }) {
  const [query, setQuery] = useState(initial);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        goHome(pathname, router, { q: query.trim() });
      }}
      className={`flex h-12 w-full items-center rounded-full border pl-4 pr-1 focus-within:ring-2 ${
        // On the purple header: a plain white field. On the white one: the
        // pale lavender field it had before.
        PURPLE_HEADER
          ? "border-transparent bg-white focus-within:ring-white/60"
          : "border-hp-line bg-hp-lavender/60 focus-within:border-hp-purple focus-within:ring-hp-purple/20"
      }`}
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-hp-muted" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        name="q"
        aria-label="Search local deals"
        placeholder="Search local deals…"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-[0.9375rem] text-hp-ink outline-none placeholder:text-hp-muted"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-10 w-12 shrink-0 items-center justify-center rounded-full bg-hp-purple text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    </form>
  );
}

/** The search box, showing the current search. The server renders it
 *  empty (the header is shared by every page); the browser fills it in. */
export default function HeaderSearch() {
  const q = useUrlSearch().get("q") ?? "";
  // Keyed on the query so going back/forward refills the box.
  return <SearchForm key={q} initial={q} />;
}
