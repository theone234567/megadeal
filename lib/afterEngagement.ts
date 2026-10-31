/**
 * Third-party scripts (GA4, the Meta Pixel) load when the visitor first
 * does something, a tap, key press or scroll, or 5 seconds after the page
 * has finished loading, whichever comes first (T244). next/script's
 * lazyOnload still ran inside a phone's first few seconds, where those two
 * scripts were about 45% of the third-party main-thread time and held back
 * the hero heading (Lighthouse mobile, 24 Oct 2026).
 *
 * Nothing is lost while waiting: gtag and fbq are set up straight away and
 * queue every call, including the first page view, until their script
 * arrives. A visitor who leaves within 5 seconds without touching the page
 * isn't counted, which is the trade.
 *
 * Except a visitor who arrived from an ad (a click ID or utm_ tags in the
 * address): their scripts start straight away (owner, 31 Oct 2026), so the
 * ad's landing page views, bounces and time on site are counted in full.
 * Paid visits are what the measurement is for; everyone else keeps the
 * faster first screen.
 */

export const ENGAGE_FALLBACK_MS = 5000;

/** Address parameters an ad click adds: Meta, Google, Microsoft and TikTok
 *  click IDs, and the utm_ tags a campaign puts on its links. */
const AD_PARAMS = ["fbclid", "gclid", "gbraid", "wbraid", "msclkid", "ttclid", "utm_source", "utm_medium", "utm_campaign"];

/** Whether this page was reached from an ad (see above). */
export function arrivedFromAd(search: string): boolean {
  if (!search) return false;
  const params = new URLSearchParams(search);
  return AD_PARAMS.some((p) => params.has(p));
}

const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

let waiting: Array<() => void> | null = null;
let fired = false;

function fire() {
  if (fired) return;
  fired = true;
  for (const e of EVENTS) window.removeEventListener(e, fire, true);
  const queued = waiting ?? [];
  waiting = null;
  for (const run of queued) {
    try {
      run();
    } catch {
      // One script failing to start mustn't stop the other.
    }
  }
}

function startWatching() {
  for (const e of EVENTS) window.addEventListener(e, fire, { capture: true, passive: true, once: true });
  const later = () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(fire, { timeout: 2000 });
      else fire();
    }, ENGAGE_FALLBACK_MS);
  };
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

/** Runs `run` once the visitor engages (see above). Shared by every caller,
 *  so all the scripts start together. */
export function afterEngagement(run: () => void): void {
  if (typeof window === "undefined") return;
  if (fired) {
    run();
    return;
  }
  if (arrivedFromAd(window.location?.search ?? "")) {
    fired = true;
    run();
    return;
  }
  if (!waiting) {
    waiting = [];
    startWatching();
  }
  waiting.push(run);
}

/** Adds an async script once; does nothing if it's already on the page. */
export function addScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

/** Tests only. */
export function resetAfterEngagementForTests(): void {
  waiting = null;
  fired = false;
}
