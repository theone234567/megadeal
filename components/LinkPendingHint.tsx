"use client";

import { useLinkStatus } from "next/link";

/**
 * Feedback the moment a card is tapped, while the page it opens is read
 * (SEO pack T230): the deal and business pages no longer flush a loading
 * skeleton first, so this is what shows the tap registered. Always
 * rendered and only faded in, so nothing on the card moves. Must sit
 * inside the <Link>.
 */
export default function LinkPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-hp-purple transition-opacity duration-200 motion-safe:animate-pulse ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
