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
