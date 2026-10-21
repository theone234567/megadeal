import { CATEGORIES, categoryPath } from "./categories";
import { dealRedemption } from "./dealRedemption";
import { DEAL_TAGS, dealTagLabel, isDealTag } from "./dealTags";
import { dealVerification } from "./dealVerification";
import { htmlToText } from "./htmlText";
import { NZ_CITIES, nzCity } from "./nzPlaces";
import type { Deal } from "./types";

/**
 * The public deals feed (/feed/deals.json): every live deal on MegaDeal as
 * plain JSON, for AI assistants, search tools and anyone building on the
 * data. Documented at /developers, with its schema at /feed/openapi.json.
 *
 * Built from the same live listing as the site's pages, so it never says
 * anything a deal page doesn't. Left out on purpose:
 *  - deal codes: a customer gets the code on the deal page, so every use
 *    of a deal is seen by MegaDeal and the business it's for;
 *  - email addresses;
 *  - the street address and map pin of a business that hides them.
 *
 * FEED_VERSION follows semver: adding a field is a minor change; renaming
 * or removing one is a major change, announced on /developers first.
 */
export const FEED_VERSION = "1.1.1";

/** Most deals one request returns; ?limit= can ask for fewer. */
export const FEED_MAX_LIMIT = 500;

export const FEED_TERMS =
  "Free to read, use and quote, including in AI answers, with a link back to the deal's page on MegaDeal. Don't bulk-copy the deals to resell them or to republish them as another deals site. Prices and dates change: check the deal page before relying on them.";

export interface FeedFilters {
  /** A key from NZ_CITIES. */
  city?: string;
  /** A category slug, e.g. "food-drink". */
  category?: string;
  /** A tag id from DEAL_TAGS. */
  tag?: string;
  /** "flash" (a few hours) or "everyday" (up to 30 days). */
  type?: "flash" | "everyday";
  /** Only deals ending at or before / after this moment (ms since 1970). */
  expiresBefore?: number;
  expiresAfter?: number;
  limit: number;
  offset: number;
}

export type FeedFilterResult = { ok: true; filters: FeedFilters } | { ok: false; error: string };

const KNOWN_PARAMS = new Set(["city", "category", "tag", "type", "expires_before", "expires_after", "limit", "offset"]);

/** A date ("2026-11-05", read as the end of that day in New Zealand when
 *  it's an upper bound, the start when it's a lower one) or a full ISO time. */
function parseWhen(value: string, endOfDay: boolean): number | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // New Zealand is UTC+12 or +13; working out which needs the date
    // itself, so ask Intl for the offset on that day.
    const noonUtc = Date.parse(`${value}T12:00:00Z`);
    if (Number.isNaN(noonUtc)) return null;
    const offsetMin = nzOffsetMinutes(noonUtc);
    const localMidnight = Date.parse(`${value}T00:00:00Z`) - offsetMin * 60_000;
    return endOfDay ? localMidnight + 86_400_000 - 1 : localMidnight;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function nzOffsetMinutes(at: number): number {
  const part = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 12 * 60;
}

/** Reads ?city=&category=&tag=&type=&expires_before=&expires_after=&limit=&offset=,
 *  refusing anything it doesn't understand (rather than quietly ignoring
 *  a typo and returning every deal). */
export function parseFeedFilters(params: URLSearchParams): FeedFilterResult {
  for (const key of params.keys()) {
    // Named back, but never more than a few characters of whatever was sent.
    if (!KNOWN_PARAMS.has(key)) return { ok: false, error: `Unknown parameter "${key.slice(0, 40)}". See /developers for the ones you can use.` };
  }
  const filters: FeedFilters = { limit: FEED_MAX_LIMIT, offset: 0 };
  const get = (k: string) => params.get(k)?.trim().toLowerCase() || undefined;

  const city = get("city");
  if (city) {
    const known = nzCity(city);
    if (!known) return { ok: false, error: `Unknown city. Use one of: ${NZ_CITIES.map((c) => c.key).join(", ")}.` };
    filters.city = known.key;
  }
  const category = get("category");
  if (category) {
    if (!CATEGORIES.some((c) => c.slug === category)) {
      return { ok: false, error: `Unknown category. Use one of: ${CATEGORIES.map((c) => c.slug).join(", ")}.` };
    }
    filters.category = category;
  }
  const tag = get("tag");
  if (tag) {
    if (!isDealTag(tag)) return { ok: false, error: `Unknown tag. Use one of: ${DEAL_TAGS.map((t) => t.id).join(", ")}.` };
    filters.tag = tag;
  }
  const type = get("type");
  if (type) {
    if (type !== "flash" && type !== "everyday") return { ok: false, error: 'Unknown type. Use "flash" or "everyday".' };
    filters.type = type;
  }
  for (const [key, field, endOfDay] of [
    ["expires_before", "expiresBefore", true],
    ["expires_after", "expiresAfter", false],
  ] as const) {
    const raw = params.get(key)?.trim();
    if (!raw) continue;
    const t = parseWhen(raw, endOfDay);
    if (t === null) return { ok: false, error: `${key} must be a date (2026-11-05) or an ISO time (2026-11-05T17:00:00+13:00).` };
    filters[field] = t;
  }
  for (const [key, min, max] of [
    ["limit", 1, FEED_MAX_LIMIT],
    ["offset", 0, 100_000],
  ] as const) {
    const raw = params.get(key)?.trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) return { ok: false, error: `${key} must be a whole number from ${min} to ${max}.` };
    filters[key] = n;
  }
  return { ok: true, filters };
}

export function matchesFilters(deal: Deal, f: FeedFilters): boolean {
  if (f.city && nzCity(deal.businessCity)?.key !== f.city) return false;
  if (f.category) {
    const name = CATEGORIES.find((c) => c.slug === f.category)?.name;
    if (!name || !deal.categories.includes(name)) return false;
  }
  if (f.tag && !(deal.tags ?? []).includes(f.tag)) return false;
  if (f.type && (f.type === "flash") !== deal.isFlash) return false;
  const ends = deal.expiresAt ? Date.parse(deal.expiresAt) : NaN;
  if (f.expiresBefore !== undefined && !(ends <= f.expiresBefore)) return false;
  if (f.expiresAfter !== undefined && !Number.isNaN(ends) && ends < f.expiresAfter) return false;
  return true;
}

const orNull = <T>(v: T | null | undefined | ""): T | null => (v === undefined || v === "" ? null : v);

/** One deal as the feed describes it. */
export function feedDeal(deal: Deal, siteUrl: string) {
  const url = `${siteUrl}/deal/${deal.slug}`;
  const city = nzCity(deal.businessCity);
  const category = CATEGORIES.find((c) => deal.categories.includes(c.name));
  const v = dealVerification(deal);
  const redemption = dealRedemption(deal, siteUrl);
  const hidden = deal.businessAddressHidden === true;
  return {
    id: deal.id,
    url,
    title: deal.name,
    description: htmlToText(deal.description),
    image: orNull(deal.image),
    // Since 1.1: every photo, the main one first.
    images: deal.image ? [deal.image, ...(deal.gallery ?? [])] : [],
    type: deal.isFlash ? "flash" : "everyday",
    price: {
      amount: deal.now,
      // The usual price, when the business gave one higher than the deal's.
      original_amount: deal.was > deal.now ? deal.was : null,
      discount_percent: deal.was > deal.now ? deal.discountPercent : null,
      currency: "NZD",
    },
    category: category ? { slug: category.slug, name: category.name, url: `${siteUrl}${categoryPath(category.name)}` } : null,
    tags: (deal.tags ?? []).map((id) => ({ id, label: dealTagLabel(id) })),
    starts_at: orNull(deal.startsAt),
    expires_at: orNull(deal.expiresAt),
    // null when the business set no limit.
    quantity_available: typeof deal.quantityAvailable === "number" ? Math.max(0, deal.quantityAvailable) : null,
    in_stock: deal.inStock,
    conditions: orNull(deal.terms?.trim()),
    redemption: {
      method: redemption.method,
      booking: redemption.booking,
      steps: redemption.steps,
    },
    business: {
      name: orNull(deal.businessName),
      url: deal.businessSlug ? `${siteUrl}/business/${deal.businessSlug}` : null,
      website: orNull(deal.businessWebsite),
      phone: orNull(deal.businessPhone),
      address: hidden ? null : orNull(deal.businessAddress),
      address_hidden: hidden,
      service_area: orNull(deal.businessServiceArea),
      suburb: orNull(deal.businessSuburb),
      city: city?.name ?? orNull(deal.businessCity),
      region: city?.region ?? null,
      country: "NZ",
      geo:
        !hidden && typeof deal.businessLat === "number" && typeof deal.businessLng === "number"
          ? { lat: deal.businessLat, lng: deal.businessLng }
          : null,
    },
    verification: {
      status: v.level,
      label: v.label,
      source: v.source,
      business_claimed: v.businessClaimed,
      approved_at: v.approvedAt,
      merchant_confirmed_at: v.merchantConfirmedAt,
      last_checked_at: v.lastCheckedAt,
    },
    updated_at: v.updatedAt,
  };
}

export type FeedDeal = ReturnType<typeof feedDeal>;

export interface FeedOptions {
  siteUrl: string;
  siteName: string;
  /** Deals are open to the public: from launch, or before it while
   *  approved businesses' deals are live (DEALS_OPEN). */
  launched: boolean;
  /** Before the public launch. With `launched`, deals are live but there
   *  may be few, and `message` says so. */
  prelaunch?: boolean;
  /** Where the site's front page is before deals open ("/" with the
   *  prelaunch homepage; /coming-soon redirects there). */
  frontPage?: string;
}

/** What `message` says, if anything. */
function feedMessage(o: FeedOptions): string | undefined {
  if (!o.launched)
    return `${o.siteName} hasn't launched yet, so there are no live deals. See ${o.siteUrl}${o.frontPage ?? "/coming-soon"}.`;
  if (o.prelaunch)
    return `${o.siteName} is in its pre-launch period: deals from approved businesses are live, but there may be only a few, or none.`;
  return undefined;
}

/** The whole response body, less the time it was generated (added by the
 *  route, so the body's ETag only changes when the deals do). */
export function buildFeed(deals: Deal[], filters: FeedFilters, o: FeedOptions) {
  const matching = o.launched ? deals.filter((d) => matchesFilters(d, filters)) : [];
  // Soonest-ending first, then by name: a stable order, so paging with
  // offset doesn't skip or repeat deals between requests.
  matching.sort(
    (a, b) =>
      (Date.parse(a.expiresAt ?? "") || Infinity) - (Date.parse(b.expiresAt ?? "") || Infinity) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
  );
  const page = matching.slice(filters.offset, filters.offset + filters.limit);
  const items = page.map((d) => feedDeal(d, o.siteUrl));
  const latest = items.reduce<string | null>(
    (best, d) => (d.updated_at && (!best || Date.parse(d.updated_at) > Date.parse(best)) ? d.updated_at : best),
    null
  );
  return {
    version: FEED_VERSION,
    publisher: { name: o.siteName, url: o.siteUrl },
    docs: `${o.siteUrl}/developers`,
    schema: `${o.siteUrl}/feed/openapi.json`,
    terms: FEED_TERMS,
    country: "NZ",
    currency: "NZD",
    launched: o.launched,
    ...(feedMessage(o) ? { message: feedMessage(o) } : {}),
    filters: {
      city: filters.city ?? null,
      category: filters.category ?? null,
      tag: filters.tag ?? null,
      type: filters.type ?? null,
      expires_before: filters.expiresBefore !== undefined ? new Date(filters.expiresBefore).toISOString() : null,
      expires_after: filters.expiresAfter !== undefined ? new Date(filters.expiresAfter).toISOString() : null,
      limit: filters.limit,
      offset: filters.offset,
    },
    total: matching.length,
    count: items.length,
    updated_at: latest,
    deals: items,
  };
}
