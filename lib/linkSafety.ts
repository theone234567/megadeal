/**
 * Link safety before a deal auto-posts (SEO pack T207). Every link a deal
 * publishes (its own booking link, website and email, and the page the
 * code is used on) must be on the business's own domain or a known
 * booking platform; anything else waits for an admin, with the reason.
 * Checked before the AI, and without it: a lookalike domain reads fine to
 * a model.
 *
 * Plain rules, no network: shorteners, raw IP addresses and punycode
 * hosts are never auto-posted. Google Safe Browsing is checked too when
 * GOOGLE_SAFE_BROWSING_KEY is set (lib/linkSafetyLookup.ts).
 */

/** Booking platforms NZ businesses use: their links auto-post. */
export const BOOKING_PLATFORMS = [
  "bookme.co.nz",
  "opentable.com",
  "opentable.co.nz",
  "opentable.com.au",
  "resy.com",
  "fresha.com",
  "gettimely.com",
  "timely.co.nz",
  "mindbodyonline.com",
  "mindbody.io",
  "sevenrooms.com",
  "nowbookit.com",
  "bookings.nowbookit.com",
  "resdiary.com",
  "eveve.com",
  "tablein.com",
  "rezdy.com",
  "fareharbor.com",
  "checkfront.com",
  "simplybook.me",
  "setmore.com",
  "square.site",
  "squareup.com",
  "calendly.com",
  "acuityscheduling.com",
  "bookwhen.com",
  "clinicsense.com",
  "cliniko.com",
  "zenoti.com",
  "phorest.com",
  "shortcuts.net.au",
] as const;

/** Mail services anyone can use: an email there is fine, but never makes
 *  the domain "the business's own". */
const FREE_MAIL = ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.nz", "live.com", "yahoo.com", "yahoo.co.nz", "icloud.com", "me.com", "xtra.co.nz", "protonmail.com", "proton.me"];

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at", "tiny.cc",
  "lnkd.in", "rb.gy", "t.ly", "s.id", "bl.ink", "short.io", "linktr.ee", "tr.ee", "qrco.de", "shorturl.com", "v.gd", "x.co",
];

/** Two-part public suffixes common in NZ and nearby, for "the domain". */
const SECOND_LEVEL = /\.(?:co|org|net|ac|govt|gen|geek|iwi|kiwi|maori|school|health|com|gov|edu|id)\.(?:nz|au|uk)$/;

export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const parts = h.split(".");
  const keep = SECOND_LEVEL.test(h) ? 3 : 2;
  return parts.slice(-keep).join(".");
}

function hostOf(value: string): string | null {
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** The business's own domains, from its approved profile (website,
 *  booking link, booking and login email unless at a free mail service). */
export function ownDomains(merchant: Record<string, any> | null | undefined): string[] {
  const out = new Set<string>();
  for (const v of [merchant?.website, merchant?.bookingUrl]) {
    const host = typeof v === "string" && v.trim() ? hostOf(v.trim()) : null;
    if (host && !isPlatform(host)) out.add(registrableDomain(host));
  }
  for (const v of [merchant?.bookingEmail, merchant?.email]) {
    const domain = typeof v === "string" ? v.split("@")[1]?.trim().toLowerCase() : "";
    if (domain && !FREE_MAIL.includes(domain)) out.add(registrableDomain(domain));
  }
  return [...out];
}

function onList(host: string, list: readonly string[]): boolean {
  return list.some((d) => host === d || host.endsWith(`.${d}`));
}
const isPlatform = (host: string) => onList(host, BOOKING_PLATFORMS);

export interface PublishedLink {
  /** What it is, as the admin reads it: "booking link", "redeem link". */
  field: string;
  value: string;
  kind: "url" | "email";
}

/** Why each link can't auto-post; empty when they all can. */
export function linkProblems(links: PublishedLink[], own: string[]): string[] {
  const problems: string[] = [];
  for (const { field, value, kind } of links) {
    const v = value.trim();
    if (!v) continue;
    if (kind === "email") {
      const domain = v.split("@")[1]?.toLowerCase() ?? "";
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) problems.push(`${field} isn't a valid email address`);
      else if (domain.split(".").some((p) => p.startsWith("xn--"))) problems.push(`${field} uses an international-character domain (${domain})`);
      else if (!FREE_MAIL.includes(domain) && !own.includes(registrableDomain(domain))) problems.push(`${field} domain not recognised (${domain})`);
      continue;
    }
    const host = hostOf(v);
    if (!host) {
      problems.push(`${field} isn't a web address`);
    } else if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) {
      problems.push(`${field} is a raw IP address (${host})`);
    } else if (host.split(".").some((p) => p.startsWith("xn--"))) {
      problems.push(`${field} uses an international-character domain (${host})`);
    } else if (onList(host, SHORTENERS)) {
      problems.push(`${field} is a link shortener (${host})`);
    } else if (!isPlatform(host) && !own.includes(registrableDomain(host))) {
      problems.push(`${field} domain not recognised (${host})`);
    }
  }
  return problems;
}

/** A New Zealand phone number, roughly: 0 or +64, then 7 to 10 digits. */
export function plausibleNzPhone(value: string): boolean {
  const digits = value.replace(/[\s().-]/g, "");
  return /^(?:\+64|0)\d{7,10}$/.test(digits) || /^0800\d{6,7}$/.test(digits);
}

const URL_IN_TEXT = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:co\.nz|nz|com|net|org|io|ly|me)\b/i;
const EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_IN_TEXT = /(?:\+?64|\b0)[\s-]?\d[\d\s-]{6,}\d/;

/** Free text that carries a link, email or phone number. */
export function contactInText(text: string | null | undefined): string | null {
  const t = text ?? "";
  if (URL_IN_TEXT.test(t)) return "a web address";
  if (EMAIL_IN_TEXT.test(t)) return "an email address";
  if (PHONE_IN_TEXT.test(t)) return "a phone number";
  return null;
}
