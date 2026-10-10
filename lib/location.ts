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

/**
 * What the public pages say beside a business's location: a hidden
 * address ("Hide my address" on its listing page) is provided by the
 * business when they book, and a business that lists the areas it
 * covers comes to its customers. Nothing for a business that shows its
 * address and lists no areas.
 */
export function locationNotes(addressHidden: boolean, serviceArea: string | null | undefined): string[] {
  const area = (serviceArea ?? "").trim();
  if (area) return [`${addressHidden ? "Comes to you" : "Also comes to you"}: covers ${area === "All of Auckland" ? "all of Auckland" : area}.`];
  return addressHidden ? ["Address provided by the business when you book."] : [];
}

/** The areas a business that goes to its customers can tick (Auckland
 *  only for now). Saved as plain text in service_area ("North Shore, West
 *  Auckland"), so what the public pages say needs no translating. */
export const AUCKLAND_AREAS = [
  "Central Auckland",
  "North Shore",
  "West Auckland",
  "East Auckland",
  "South Auckland",
  "Rodney",
  "Franklin",
  "Waiheke & islands",
] as const;
export const ALL_OF_AUCKLAND = "All of Auckland";

/** The ticked areas in a saved service_area, in list order; null when the
 *  text isn't made of them (typed for a business outside Auckland). */
export function tickedAreas(saved: string | null | undefined): string[] | null {
  const text = (saved ?? "").trim();
  if (!text) return [];
  if (text === ALL_OF_AUCKLAND) return [...AUCKLAND_AREAS];
  const parts = text.split(/\s*,\s*/);
  return parts.every((p) => (AUCKLAND_AREAS as readonly string[]).includes(p)) ? AUCKLAND_AREAS.filter((a) => parts.includes(a)) : null;
}

/** Ticked areas as saved: every one is "All of Auckland". */
export function areasText(areas: string[]): string {
  const picked = AUCKLAND_AREAS.filter((a) => areas.includes(a));
  return picked.length === AUCKLAND_AREAS.length ? ALL_OF_AUCKLAND : picked.join(", ");
}
