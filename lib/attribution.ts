export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
  capturedAt?: string;
}

const STORAGE_KEY = "mg_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/**
 * First-touch attribution: captured once, on whichever page a visitor
 * first lands on with utm_ or fbclid params in the URL, then read back
 * whenever they eventually sign up — even if that's days later and
 * several pages past the one their ad actually landed them on.
 * Overwriting on every visit would credit whichever ad someone clicked
 * most recently rather than the one that actually brought them in, which
 * is the wrong side of that tradeoff for a low-frequency action like
 * registering a business.
 */
export function captureAttribution(search: URLSearchParams): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return; // already have a first touch

    const data: Attribution = {};
    for (const key of UTM_KEYS) {
      const value = search.get(key);
      if (value) data[key] = value.slice(0, 200);
    }
    const fbclid = search.get("fbclid");
    if (fbclid) data.fbclid = fbclid.slice(0, 200);
    if (Object.keys(data).length === 0) return; // nothing worth remembering

    data.landingPage = window.location.pathname;
    data.referrer = document.referrer || undefined;
    data.capturedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing / blocked storage — attribution just won't carry
    // through to signup. Not worth failing anything over.
  }
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** The Meta Pixel sets this itself once it's actually configured and
 *  loaded — passing it through to Conversions API improves event match
 *  quality (see lib/metaCapi.ts). */
export function getFbp(): string | undefined {
  return readCookie("_fbp");
}

/**
 * Meta's documented `fbc` format (`fb.1.<timestamp>.<fbclid>`), built from
 * a captured fbclid when the pixel hasn't already set the `_fbc` cookie
 * itself — which it only does once NEXT_PUBLIC_META_PIXEL_ID is actually
 * configured, so this fallback keeps click attribution intact for anyone
 * who arrives before that's set up.
 */
export function getFbc(): string | undefined {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;
  const attribution = getAttribution();
  if (attribution?.fbclid) return `fb.1.${Date.now()}.${attribution.fbclid}`;
  return undefined;
}
