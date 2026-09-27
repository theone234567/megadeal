"use client";

import { useSearchParams } from "next/navigation";

/**
 * Shows the hero on the plain homepage and hides it while searching, so
 * results come straight after the search box. Client-side because a search
 * from the header changes the URL without reloading the page. The results
 * area supplies the page's heading while the hero is hidden.
 */
export default function SearchAwareHero({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  return searchParams.get("q")?.trim() ? null : <>{children}</>;
}
