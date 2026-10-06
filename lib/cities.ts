/**
 * The cities MegaDeal runs in. Category, flash-deal and city pages live
 * under the city (/auckland/food-drink), so a second city is new pages
 * beside the first, not a move of every address that's already ranking.
 */
export interface CityDef {
  slug: string;
  name: string;
}

export const CITIES: CityDef[] = [{ slug: "auckland", name: "Auckland" }];

/** Where the site is now. Becomes a choice once there's a second city. */
export const DEFAULT_CITY = CITIES[0];

export function cityPath(city: CityDef = DEFAULT_CITY): string {
  return `/${city.slug}`;
}

export function flashDealsPath(city: CityDef = DEFAULT_CITY): string {
  return `/${city.slug}/flash-deals`;
}
