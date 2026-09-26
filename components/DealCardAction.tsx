"use client";

import { useEffect, useState } from "react";

// setTimeout overflows past ~24.8 days; longer waits re-check in steps.
const MAX_TIMEOUT_MS = 2_000_000_000;

/**
 * The action strip at the foot of a DealCard. Its own client component so
 * it can switch to "Offer ended" the moment the deadline passes on an
 * already-open page, while the rest of the card stays server-rendered.
 * Starts as the live label on both server and first client render (no
 * Date.now() before mount — see CountdownBadge for why).
 *
 * A styled span, not a <button>: the whole card is already the link, and
 * an interactive element nested inside an anchor is invalid and confuses
 * keyboard and screen-reader users.
 */
export default function DealCardAction({
  expiresAt,
  isFlash,
  soldOut,
}: {
  expiresAt: string | null;
  isFlash: boolean;
  soldOut: boolean;
}) {
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    let id: ReturnType<typeof setTimeout>;
    function check() {
      const msLeft = deadline - Date.now();
      if (msLeft <= 0) {
        setEnded(true);
        return;
      }
      id = setTimeout(check, Math.min(msLeft + 250, MAX_TIMEOUT_MS));
    }
    check();
    return () => clearTimeout(id);
  }, [expiresAt]);

  const inactive = soldOut || ended;
  return (
    <span
      aria-hidden
      className={`mt-4 flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold transition ${
        inactive ? "bg-slate-100 text-slate-500" : "bg-brand-600 text-white group-hover:bg-brand-700"
      }`}
    >
      {soldOut ? "Sold out" : ended ? "Offer ended" : isFlash ? "View Flash Deal" : "View deal"}
    </span>
  );
}
