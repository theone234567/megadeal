"use client";

import { useEffect } from "react";

/**
 * Opens the <details> a link points at (/help#deal-checks), so a link to
 * one question lands on its answer rather than a closed heading.
 */
export default function OpenHashedDetails() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
