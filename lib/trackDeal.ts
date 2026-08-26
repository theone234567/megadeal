/**
 * Fire-and-forget merchant analytics ping — never awaited by callers, and
 * failures are swallowed, since a lost analytics event should never affect
 * the visitor's experience.
 */
export function trackDealEvent(productId: string, event: "view" | "click") {
  try {
    fetch("/api/deals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
