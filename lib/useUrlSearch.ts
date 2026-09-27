"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * The current URL's query string, for the homepage's filters and the
 * header's search and location controls.
 *
 * Used instead of Next's useSearchParams because that hook makes the
 * server stream a placeholder first and the real markup afterwards in a
 * hidden block — so the page's raw HTML carried the hero twice (two
 * <h1>s) and the deal grid only inside a hidden element. Crawlers that
 * don't run JavaScript read that raw HTML. Here the server renders with
 * the query string it was given (`serverSearch`), and the browser reads
 * the real URL, re-rendering when it changes through pushUrl() or the
 * back/forward buttons.
 */

const CHANGE_EVENT = "megadeal:urlchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Changes the URL in place — no server round trip — and tells every
 *  useUrlSearch() caller. */
export function pushUrl(href: string) {
  window.history.pushState(null, "", href);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useUrlSearch(serverSearch = ""): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => serverSearch
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

