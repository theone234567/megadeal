"use client";

import { useCallback, useRef } from "react";
import { trackDealEvent } from "./trackDeal";
import type { DealAction } from "./dealEvents";

/**
 * Counts what a customer does on a deal page: each action once per visit,
 * wherever on the page it was tapped, and the visit's first action also
 * as its one "interest". Nothing is counted in a preview.
 */
export function useDealActionTracker(dealId: string, preview: boolean) {
  const done = useRef(new Set<DealAction>());
  return useCallback(
    (action: DealAction) => {
      if (preview || done.current.has(action)) return;
      const first = done.current.size === 0;
      done.current.add(action);
      trackDealEvent(dealId, action, first);
    },
    [dealId, preview],
  );
}
