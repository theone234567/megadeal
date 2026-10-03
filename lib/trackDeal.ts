import type { DealEvent } from "./dealEvents";

/**
 * Fire-and-forget merchant analytics ping — never awaited by callers, and
 * failures are swallowed, since a lost analytics event should never affect
 * the visitor's experience. `firstInterest` also counts the visit's one
 * "interest" (clickCount) in the same request.
 */
export function trackDealEvent(productId: string, event: DealEvent, firstInterest = false) {
  try {
    fetch("/api/deals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, event, ...(firstInterest ? { firstInterest: true } : {}) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
