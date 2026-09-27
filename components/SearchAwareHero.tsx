"use client";

import { useUrlSearch } from "@/lib/useUrlSearch";

/**
 * Shows the hero on the plain homepage and hides it while searching, so
 * results come straight after the search box. Client-side because a search
 * from the header changes the URL without reloading the page. The results
 * area supplies the page's heading while the hero is hidden.
 */
export default function SearchAwareHero({
  children,
  initialSearch = "",
}: {
  children: React.ReactNode;
  /** The query string the server rendered with. */
  initialSearch?: string;
}) {
  const searchParams = useUrlSearch(initialSearch);
  return searchParams.get("q")?.trim() ? null : <>{children}</>;
}
