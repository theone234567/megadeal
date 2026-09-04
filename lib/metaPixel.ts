declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Meta Pixel event if the pixel is actually loaded (see
 * components/MetaPixel.tsx) — a no-op otherwise, so calling this is safe
 * regardless of whether NEXT_PUBLIC_META_PIXEL_ID is configured, or if an
 * ad blocker stripped the pixel script. Never throws.
 */
export function trackMetaPixelEvent(eventName: string, params?: Record<string, unknown>): void {
  try {
    window.fbq?.("track", eventName, params);
  } catch {
    // Tracking must never break the actual user-facing action it's attached to.
  }
}
