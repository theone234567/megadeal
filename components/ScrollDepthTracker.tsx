"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const THRESHOLDS = [25, 50, 75, 100];

/**
 * Site-wide scroll-depth instrumentation — sends a GA4 "scroll_depth" event
 * the first time a visitor crosses 25/50/75/100% of a page's height, so we
 * can see where visitors actually stop reading on long single-page layouts
 * (like /businesses) instead of guessing from copy alone. No-ops silently
 * when GA isn't configured — window.gtag is then just undefined.
 */
export default function ScrollDepthTracker() {
  const pathname = usePathname();
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedRef.current = new Set();
    let ticking = false;

    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        const percent =
          scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 100;

        for (const threshold of THRESHOLDS) {
          if (percent >= threshold && !firedRef.current.has(threshold)) {
            firedRef.current.add(threshold);
            window.gtag?.("event", "scroll_depth", {
              percent_scrolled: threshold,
              page_path: pathname,
            });
          }
        }
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return null;
}
