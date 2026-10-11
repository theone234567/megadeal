"use client";

import { useCallback, useMemo, useRef } from "react";
import { trackDealEvent } from "./trackDeal";
import type { DealAction } from "./dealEvents";

/**
 * Counts what a customer does on a deal page: each action once per visit,
 * wherever on the page it was tapped, and the visit's one "interest"
 * (clickCount) — either opening "Contact business" or, if that came
 * later or never, the visit's first action. Nothing is counted in a
 * preview.
 */
export function useDealActionTracker(dealId: string, preview: boolean) {
  const done = useRef(new Set<DealAction>());
  const interested = useRef(false);
  const track = useCallback(
    (action: DealAction) => {
      if (preview || done.current.has(action)) return;
      const first = !interested.current;
      done.current.add(action);
      interested.current = true;
      trackDealEvent(dealId, action, first);
    },
    [dealId, preview],
  );
  /** Opening "Contact business": interest on its own, once per visit. */
  const interest = useCallback(() => {
    if (preview || interested.current) return;
    interested.current = true;
    trackDealEvent(dealId, "click");
  }, [dealId, preview]);
  return useMemo(() => ({ track, interest }), [track, interest]);
}
