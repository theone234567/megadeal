/**
 * New Zealand cities the deals data knows, for the public feed's city
 * filter (/feed/deals.json?city=) and the region in each deal's
 * structured data. Not the site's city pages: those are lib/cities.ts,
 * which lists only the cities that have pages.
 *
 * A business's city is free text from its address; nzCity() matches it
 * to one of these, ignoring case and macrons.
 */
export interface NzCity {
  /** Stable key, as used in ?city= */
  key: string;
  name: string;
  /** The region it reports in structured data (schema.org addressRegion). */
  region: string;
}

export const NZ_CITIES: NzCity[] = [
  { key: "auckland", name: "Auckland", region: "Auckland" },
  { key: "wellington", name: "Wellington", region: "Wellington" },
  { key: "christchurch", name: "Christchurch", region: "Canterbury" },
  { key: "hamilton", name: "Hamilton", region: "Waikato" },
  { key: "tauranga", name: "Tauranga", region: "Bay of Plenty" },
  { key: "dunedin", name: "Dunedin", region: "Otago" },
  { key: "queenstown", name: "Queenstown", region: "Otago" },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** The known city a business's city text names, or null. */
export function nzCity(city: string | null | undefined): NzCity | null {
  if (!city) return null;
  const f = fold(city);
  return NZ_CITIES.find((c) => c.key === f || fold(c.name) === f) ?? null;
}
