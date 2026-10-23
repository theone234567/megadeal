/**
 * Where a business came from when it signed up (lib/attribution.ts's first
 * touch, sent with the sign-up), kept on its record (merchants.signup_source)
 * so the admin page can show which ads and sites bring real businesses, not
 * just clicks. Only what that needs: the campaign tags, which ad network's
 * click it was (not the click id itself), the page it landed on, and the
 * other site's name (not the full address it came from).
 */

export interface SignupSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** An ad click, by network: from fbclid or gclid. */
  adClick?: "facebook" | "google";
  landingPage?: string;
  /** The other site's host, e.g. "www.google.com". */
  referrerHost?: string;
  /** When they first arrived. */
  firstVisit?: string;
}

const text = (v: unknown, max = 100): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);
  return t || undefined;
};

/** The parts worth keeping from what the browser sent, or null for none. */
export function signupSourceFrom(raw: unknown): SignupSource | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const out: SignupSource = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = text(a[k]);
    if (v) out[k] = v;
  }
  if (text(a.gclid)) out.adClick = "google";
  else if (text(a.fbclid)) out.adClick = "facebook";
  const page = text(a.landingPage, 200);
  if (page && /^\/[^\s]*$/.test(page)) out.landingPage = page;
  try {
    const ref = text(a.referrer, 500);
    if (ref) {
      const u = new URL(ref);
      if (u.protocol === "https:" || u.protocol === "http:") out.referrerHost = u.hostname.slice(0, 100);
    }
  } catch {
    // Not an address: left out.
  }
  const when = text(a.capturedAt, 40);
  if (when && Number.isFinite(Date.parse(when))) out.firstVisit = new Date(when).toISOString();
  // A landing page and a date alone don't say where they came from.
  const told = out.adClick || out.referrerHost || out.utm_source || out.utm_medium || out.utm_campaign || out.utm_content || out.utm_term;
  return told ? out : null;
}

const SITES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
];

/** "Facebook ad · campaign spring-cafes" / "Google search" / "From neighbourly.co.nz". */
export function describeSignupSource(s: SignupSource | null | undefined): string | null {
  if (!s) return null;
  const site = s.referrerHost ? SITES.find(([re]) => re.test(s.referrerHost!))?.[1] : undefined;
  const parts: string[] = [];
  if (s.adClick) parts.push(`${s.adClick === "google" ? "Google" : "Facebook"} ad`);
  else if (s.utm_source) parts.push(`${s.utm_source}${s.utm_medium ? ` (${s.utm_medium})` : ""}`);
  else if (site) parts.push(site === "Google" || site === "Bing" ? `${site} search` : site);
  else if (s.referrerHost) parts.push(`From ${s.referrerHost}`);
  if (s.utm_campaign) parts.push(`campaign ${s.utm_campaign}`);
  if (s.utm_content) parts.push(`ad ${s.utm_content}`);
  return parts.join(" · ") || null;
}
