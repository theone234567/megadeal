/**
 * Where a business is, in words: its suburb and city, for deal and business
 * page titles, the line under a deal's name, deal cards and the address in
 * structured data. More specific place names match more of what people
 * search ("bike tour Takapuna", "facial Ponsonby").
 */

const MAX_SUBURB_LENGTH = 40;

/**
 * The business's suburb: the one saved with its address, or else read out of
 * a full address such as "12 Hurstmere Road, Takapuna, Auckland 0622" (the
 * form Google's address suggestions are saved in). null when there isn't
 * one to be sure of — a bare street ("5A Camelot Place"), or an address with
 * no part before the city other than the street.
 */
export function businessSuburb(
  saved: string | null | undefined,
  address: string | null | undefined,
  city: string | null | undefined
): string | null {
  const own = (saved ?? "").trim();
  if (own) return own.slice(0, MAX_SUBURB_LENGTH);

  const c = (city ?? "").trim().toLowerCase();
  if (!c || !address) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // The last part that starts with the city ("Auckland 0622"): an earlier
  // one can too ("Auckland CBD" is a suburb of Auckland).
  let cityAt = -1;
  parts.forEach((p, i) => {
    if (p.toLowerCase().startsWith(c)) cityAt = i;
  });
  // Needs a street before the suburb, so a street is never taken for one.
  if (cityAt < 2) return null;
  const candidate = parts[cityAt - 1];
  if (/^\d/.test(candidate) || candidate.toLowerCase() === c || candidate.length > MAX_SUBURB_LENGTH) return null;
  return candidate;
}

/**
 * "Takapuna, Auckland", or just the one that's known. The city is left off
 * when the suburb already names it ("Auckland CBD").
 */
export function placeLabel(suburb: string | null | undefined, city: string | null | undefined): string | null {
  const s = (suburb ?? "").trim();
  const c = (city ?? "").trim();
  if (s && c) return s.toLowerCase().includes(c.toLowerCase()) ? s : `${s}, ${c}`;
  return s || c || null;
}

/**
 * The address and map pin the public may see. A home-based or mobile
 * business (hideAddress, chosen on its listing page) keeps its street
 * private: no street, and a pin rounded to two decimal places (about a
 * kilometre), close enough for "near me" and the deals map but not the
 * door. The same rounding as the public_businesses view
 * (supabase/migrations/20261014000000_hidden_address.sql).
 */
export function publicLocation(m: {
  address?: string | null;
  lat?: unknown;
  lng?: unknown;
  hideAddress?: unknown;
}): { address: string | null; lat: number | null; lng: number | null; addressHidden: boolean } {
  const lat = typeof m.lat === "number" && Number.isFinite(m.lat) ? m.lat : null;
  const lng = typeof m.lng === "number" && Number.isFinite(m.lng) ? m.lng : null;
  if (m.hideAddress === true) {
    const round = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);
    return { address: null, lat: round(lat), lng: round(lng), addressHidden: true };
  }
  return { address: m.address || null, lat, lng, addressHidden: false };
}

/** How customers reach a business, chosen on its listing page
 *  (supabase/migrations/20261015000000_visit_type.sql). Anything but
 *  "premises" keeps the street address private. */
export type VisitType = "premises" | "appointment" | "mobile" | "online";
export const VISIT_TYPES: readonly VisitType[] = ["premises", "appointment", "mobile", "online"];
export function parseVisitType(value: unknown): VisitType {
  return VISIT_TYPES.includes(value as VisitType) ? (value as VisitType) : "premises";
}

/** What the public pages say for a business that keeps its address
 *  private, by how customers reach it. Null for premises. */
export function visitNote(visitType: VisitType | undefined, serviceArea: string | null | undefined): string | null {
  switch (visitType) {
    case "appointment":
      return "By appointment: address provided by the business when you book.";
    case "mobile":
      return `Comes to you${serviceArea ? `: covers ${serviceArea}` : ""}.`;
    case "online":
      return "Online business.";
    default:
      return null;
  }
}

/** The visit type the public sees: premises for a business showing its
 *  address, otherwise what it chose (appointment when an address was
 *  hidden before the visit type existed). */
export function publicVisitType(addressHidden: boolean, saved: unknown): VisitType {
  if (!addressHidden) return "premises";
  const v = parseVisitType(saved);
  return v === "premises" ? "appointment" : v;
}
