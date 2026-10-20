import type { Deal } from "./types";
import type { Coords } from "./geo";
import { isDealLive } from "./dealVisibility";
import { categoryBySlug } from "./categories";
import { dealDistanceKm, sortDeals, type SortOption } from "./sortDeals";

/**
 * The homepage's filter state, kept in the URL so it survives back/forward
 * and can be shared: /?q=pizza&city=Auckland&category=food-drink&type=flash
 *
 * One pipeline for every collection on the page: query, city, category,
 * price and distance are applied once, then the result is split by deal
 * type. That's what keeps the Flash and Everyday collections from ever
 * disagreeing — the Flash row used to be drawn from the whole catalogue
 * above a filtered list.
 */

export type DealType = "all" | "everyday" | "flash";
export type BrowseView = "grid" | "map";
export type PriceBand = "" | "under25" | "25to50" | "50to100" | "100plus";

export interface HomeFilters {
  q: string;
  city: string;
  /** A category slug from lib/categories.ts, or "" for all categories. */
  category: string;
  type: DealType;
  price: PriceBand;
  sort: SortOption;
  /** Only deals within this many km — needs the visitor's location. */
  within: number | null;
  /** Cards or the map: the same deals either way. */
  view: BrowseView;
}

export const PRICE_BANDS: { value: PriceBand; label: string; min: number; max: number }[] = [
  { value: "under25", label: "Under $25", min: 0, max: 25 },
  { value: "25to50", label: "$25–$50", min: 25, max: 50 },
  { value: "50to100", label: "$50–$100", min: 50, max: 100 },
  { value: "100plus", label: "$100+", min: 100, max: Infinity },
];

export const DISTANCE_OPTIONS = [2, 5, 10, 25] as const;

const SORTS: SortOption[] = ["recommended", "ending", "discount", "priceAsc", "priceDesc", "nearest"];
const TYPES: DealType[] = ["all", "everyday", "flash"];

type ParamSource = { get(name: string): string | null };

export function parseHomeFilters(params: ParamSource): HomeFilters {
  const get = (k: string) => (params.get(k) ?? "").trim();
  const category = get("category");
  const type = get("type") as DealType;
  const price = get("price") as PriceBand;
  const sort = get("sort") as SortOption;
  const within = Number(get("within"));
  return {
    q: get("q").slice(0, 100),
    city: get("city").slice(0, 60),
    category: categoryBySlug(category) ? category : "",
    type: TYPES.includes(type) ? type : "all",
    price: PRICE_BANDS.some((b) => b.value === price) ? price : "",
    sort: SORTS.includes(sort) ? sort : "recommended",
    within: (DISTANCE_OPTIONS as readonly number[]).includes(within) ? within : null,
    view: get("view") === "map" ? "map" : "grid",
  };
}

/** The homepage URL for `filters` with `patch` applied. Defaults are left
 *  out, so the plain homepage stays "/". `base` is the page's path — "/"
 *  except in the local design harness. */
export function homeHref(filters: HomeFilters, patch: Partial<HomeFilters> = {}, base = "/"): string {
  const f = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.city) params.set("city", f.city);
  if (f.category) params.set("category", f.category);
  if (f.type !== "all") params.set("type", f.type);
  if (f.price) params.set("price", f.price);
  if (f.within) params.set("within", String(f.within));
  if (f.sort !== "recommended") params.set("sort", f.sort);
  if (f.view === "map") params.set("view", "map");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Every live deal that matches the filters, sorted. Distance filtering
 * only applies once the visitor's location is known — without it there's
 * nothing to measure from, so no deal is dropped for it.
 */
export function matchDeals(deals: Deal[], f: HomeFilters, now: number, coords: Coords | null = null): Deal[] {
  const q = f.q.toLowerCase();
  const city = f.city.toLowerCase();
  const categoryName = f.category ? categoryBySlug(f.category)?.name ?? null : null;
  const band = PRICE_BANDS.find((b) => b.value === f.price);

  const matching = deals.filter((d) => {
    if (!isDealLive(d, now)) return false;
    if (
      q &&
      !(
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.businessName ?? "").toLowerCase().includes(q) ||
        // Searching a suburb ("Takapuna") finds the deals there.
        (d.businessSuburb ?? "").toLowerCase().includes(q) ||
        d.categories.some((c) => c.toLowerCase().includes(q))
      )
    ) {
      return false;
    }
    // Same exact-city match as before: a deal's town, not a region.
    if (city && (d.businessCity ?? "").toLowerCase() !== city) return false;
    if (categoryName && !d.categories.includes(categoryName)) return false;
    if (band && !(d.now >= band.min && d.now < band.max)) return false;
    if (f.within && coords) {
      const km = dealDistanceKm(d, coords);
      if (km === null || km > f.within) return false;
    }
    return true;
  });
  return sortDeals(matching, f.sort, coords);
}

/** Flash and Everyday collections for the chosen type. A deal is in one
 *  or the other, never both. */
export function splitByType(matching: Deal[], type: DealType): { flash: Deal[]; everyday: Deal[] } {
  return {
    flash: type === "everyday" ? [] : matching.filter((d) => d.isFlash),
    everyday: type === "flash" ? [] : matching.filter((d) => !d.isFlash),
  };
}

/** The deals of one type from a matching list, in the same order: "all"
 *  keeps Flash and Everyday together in one list. */
export function filterByType(matching: Deal[], type: DealType): Deal[] {
  return type === "all" ? matching : matching.filter((d) => (type === "flash") === d.isFlash);
}

/** The settings inside the Filters panel. Category, deal type, search,
 *  sort and map/grid each have their own control, so they aren't here. */
export type PanelFilters = Pick<HomeFilters, "price" | "within">;

export const NO_PANEL_FILTERS: PanelFilters = { price: "", within: null };

/** How many of the Filters panel's groups are set: the number on the
 *  Filters button. */
export function panelFilterCount(f: PanelFilters): number {
  return (f.price ? 1 : 0) + (f.within ? 1 : 0);
}

/** One removable chip per applied panel filter, with what removing it
 *  changes. */
export function panelFilterChips(f: PanelFilters): { key: keyof PanelFilters; label: string; clear: Partial<PanelFilters> }[] {
  const chips: { key: keyof PanelFilters; label: string; clear: Partial<PanelFilters> }[] = [];
  const band = PRICE_BANDS.find((b) => b.value === f.price);
  if (band) chips.push({ key: "price", label: band.label, clear: { price: "" } });
  if (f.within) chips.push({ key: "within", label: `Within ${f.within} km`, clear: { within: null } });
  return chips;
}

/** The homepage's own query parameters. Anything else in its address
 *  (utm_source, fbclid, gclid and other tracking tags from ads and links)
 *  isn't a filter: such a visit gets the plain homepage. */
export const FILTER_PARAMS = ["q", "city", "category", "type", "price", "sort", "within", "view"] as const;

/** True when the address asks for a search, filter or view of the deals,
 *  not the plain homepage. */
export function hasFilterParams(params: ParamSource): boolean {
  return FILTER_PARAMS.some((k) => (params.get(k) ?? "").trim() !== "");
}

/** True when anything other than the deal type narrows the results. */
export function hasNarrowingFilters(f: HomeFilters): boolean {
  return Boolean(f.q || f.city || f.category || f.price || f.within);
}

/** A page's searchParams prop as a query string ("?a=1", or ""), for
 *  useUrlSearch's server render. */
export function toSearchString(params: Record<string, string | string[] | undefined>): string {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") out.set(key, value);
    else if (Array.isArray(value) && value.length) out.set(key, value[0]);
  }
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}
