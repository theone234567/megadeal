declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Meta Pixel *standard* event (one from Meta's fixed list — Lead,
 * CompleteRegistration, ViewContent, etc.) if the pixel is actually loaded
 * (see components/MetaPixel.tsx) — a no-op otherwise, so calling this is
 * safe regardless of whether NEXT_PUBLIC_META_PIXEL_ID is configured, or
 * if an ad blocker stripped the pixel script. Never throws.
 *
 * `eventId` pairs this browser-side event with the matching server-side
 * Conversions API call for the same conversion (see lib/metaCapi.ts) —
 * without a shared ID, Meta counts the Pixel and CAPI copies of the same
 * signup as two separate conversions instead of deduplicating them into one.
 */
export function trackMetaPixelEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  try {
    window.fbq?.("track", eventName, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Tracking must never break the actual user-facing action it's attached to.
  }
}

/**
 * Fires a Meta Pixel *custom* event — a funnel step specific to MegaDeal
 * (e.g. "started filling in the business signup form") that isn't one of
 * Meta's standard event names, so it needs `trackCustom` rather than
 * `track`. Same no-op-when-unconfigured/never-throws behaviour as
 * trackMetaPixelEvent.
 */
export function trackMetaCustomEvent(eventName: string, params?: Record<string, unknown>): void {
  try {
    window.fbq?.("trackCustom", eventName, params);
  } catch {
    // Tracking must never break the actual user-facing action it's attached to.
  }
}
