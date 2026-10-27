import "server-only";
import { cache } from "react";
import type { PublicBusiness } from "./business";
import { isDealLive } from "./dealVisibility";
import { toListingDeal } from "./listingDeal";
import { readEdgeCache, writeEdgeCache } from "./edgeCache";
import type { Deal } from "./types";
import { withDb } from "./db/connection";
import * as pg from "./db/publicReads";
import { soldOutLast } from "./sortDeals";
import { readListingVersion } from "./listingVersion";

/**
 * Server-only lookup for a deal page (its metadata, JSON-LD and body).
 *
 * Wrapped in React's cache(): the page's generateMetadata and its body
 * both ask for the deal.
 *
 * null means the deal isn't there to show (no such deal, not live, no
 * approved business) and the page answers "not found". A failed read is
 * different: it's tried once more and, if it fails again, thrown, so the
 * visitor gets the "Something went sideways / Try again" page rather than
 * being told a live deal doesn't exist.
 *
 * Tried first: the deal from a listing read in the last minute that is
 * still current (see liveDealFromListing), which needs no full read.
 */
export const fetchDealForSEO = cache(async (slug: string): Promise<Deal | null> => {
  const fromListing = await liveDealFromListing(slug);
  if (fromListing) return fromListing;
  const read = await readDealCached(slug);
  return read?.live ? read.deal : null;
});

/**
 * A deal that was on the site and has since ended — expired, paused or
 * withdrawn — for the "This deal has ended" page, so an old shared link
 * lands on the business's other deals rather than a dead end. Only a deal
 * that was actually published (firstPublishedAt / everLive) from a
 * business that's still approved: drafts, deals that were never approved,
 * and a suspended business's deals stay "not found".
 */
export const fetchEndedDeal = cache(async (slug: string): Promise<Deal | null> => {
  const read = await readDealCached(slug);
  return read && !read.live && read.wasPublished ? read.deal : null;
});

/** One read per request, shared by the two lookups above. */
const readDealCached = cache((slug: string) => retryUnlessMissing("deal", slug, readDeal));

/**
 * Runs a page's read, and once more after a short pause if it fails; a
 * failure that repeats is thrown, for the page's error screen.
 */
async function retryUnlessMissing<T>(what: string, key: string, read: (key: string) => Promise<T | null>): Promise<T | null> {
  try {
    return await read(key);
  } catch (err) {
    console.error(`[${what}] read failed, retrying once`, key, err);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return read(key);
  }
}

interface DealRead {
  deal: Deal;
  /** Showing on the site now. */
  live: boolean;
  /** Was ever published, so an ended page for it may be shown. */
  wasPublished: boolean;
}

/** The deal behind a slug, with its business applied, live or not; null when
 *  it isn't a real deal from an approved business. */
async function readDeal(slug: string): Promise<DealRead | null> {
  return withDb((db) => pg.readDealBySlug(db, slug));
}

/**
 * All currently-live deals with business info applied, server-rendered —
 * this is what backs the homepage, category pages, and flash deals list,
 * so the actual deal listings are present in the raw HTML a crawler gets
 * on first request instead of only appearing after client-side JS fetches
 * them.
 *
 * Wrapped in React's cache() so a page and its generateMetadata (the
 * category page needs the count for its robots tag) share one read.
 */
export const fetchAllLiveDealsServer = cache(fetchAllLiveDeals);

// The pages behind this read the query string, which makes them render on
// every request — their `revalidate` never applied, and there's no
// persistent cache configured on Cloudflare (open-next.config.ts). So
// the listing is kept for a minute: in this server instance's memory, and in the data centre's
// shared cache (lib/edgeCache.ts) so the site's other instances there can
// use it too. Only resolved plain data is kept — never a promise, which a
// Worker can't share between requests.
const LISTING_FRESH_MS = 60 * 1000;
// If the database fails, a recent copy is served rather than an empty page: an
// empty listing would show "no deals" and mark every category page
// noindex, and a crawler arriving then would take both at face value.
const LISTING_STALE_MS = 15 * 60 * 1000;
// Bump when the shape of a stored Deal changes, so a deploy never reads a
// copy stored by the previous version.
const LISTING_CACHE_KEY = "live-deals-v2-postgres";

// The deals are kept whole — contact details, deal code and all — so the
// deal page can use them (fetchDealForSEO). Listings get them trimmed by
// toListingDeal on the way out. `version` is what they were built from
// (lib/listingVersion.ts): a copy whose version is out of date is never
// used, so a deal paused, cancelled or newly published shows on the very
// next request (T214), not after the minute.
type Listing = { at: number; version: string | null; deals: Deal[] };
let lastListing: Listing | null = null;

/** The listing version now: one tiny read per request. null if it can't
 *  be read, and then a copy under a minute old is used as before. */
const currentVersion = cache(async (): Promise<string | null> => {
  try {
    return await withDb((db) => readListingVersion(db));
  } catch (err) {
    console.error("[fetchDealServer] listing version unavailable", err);
    return null;
  }
});

/** A copy of the listing no older than a minute and still current, without a full read. */
async function freshListing(now: number): Promise<Listing | null> {
  const version = await currentVersion();
  const usable = (l: Listing | null) => l && now - l.at < LISTING_FRESH_MS && (version === null || l.version === version);
  if (usable(lastListing)) return lastListing;
  const shared = await readEdgeCache<{ version: string | null; deals: Deal[] }>(LISTING_CACHE_KEY);
  const fromShared = shared ? { at: shared.at, version: shared.value.version, deals: shared.value.deals } : null;
  if (usable(fromShared)) {
    lastListing = fromShared;
    return lastListing;
  }
  return null;
}

async function currentListing(): Promise<Listing | null> {
  const now = Date.now();
  const fresh = await freshListing(now);
  if (fresh) return fresh;
  try {
    const at = Date.now();
    const version = await currentVersion();
    const deals = await loadAllLiveDeals();
    lastListing = { at, version, deals };
    await writeEdgeCache(LISTING_CACHE_KEY, { version, deals }, at, LISTING_STALE_MS / 1000);
    return lastListing;
  } catch (err) {
    console.error("[fetchAllLiveDealsServer] failed", err);
    if (lastListing && now - lastListing.at < LISTING_STALE_MS) return lastListing;
    return null;
  }
}

async function fetchAllLiveDeals(): Promise<Deal[]> {
  const listing = await currentListing();
  if (!listing) return [];
  // Re-checked on the way out: a deal can expire while it's held here.
  const now = Date.now();
  // Newest first, sold-out deals last: the city, category and "more
  // deals" lists show them in this order.
  return soldOutLast(listing.deals.filter((d) => isDealLive(d, now)).map(toListingDeal));
}

/**
 * A deal straight from a listing read in the last minute and still
 * current, if it's in it: the listing already holds every live deal whole
 * (built the same way as readDeal), so opening a deal from the homepage
 * needs no full read. null when there's no such listing or the deal isn't
 * in it, and the caller reads the database. A deal paused since the copy
 * was made has changed the version, so its page isn't shown from it.
 */
async function liveDealFromListing(slug: string): Promise<Deal | null> {
  const now = Date.now();
  const listing = await freshListing(now);
  const deal = listing?.deals.find((d) => d.slug === slug);
  return deal && isDealLive(deal, now) ? deal : null;
}

/** One full read of the listing. Throws on failure — the caller decides
 *  what to serve instead. */
async function loadAllLiveDeals(): Promise<Deal[]> {
  return withDb((db) => pg.loadLiveDeals(db));
}

/**
 * Test businesses' live deals, for the homepage's example deals and their
 * example pages (lib/db/publicReads.ts loadTestBusinessDeals). Kept for a
 * minute, like the listing; a failed read is just no extra examples.
 */
let testDealsCache: { at: number; deals: Deal[] } | null = null;
export const fetchTestBusinessDeals = cache(async (): Promise<Deal[]> => {
  const now = Date.now();
  if (testDealsCache && now - testDealsCache.at < 60_000) return testDealsCache.deals;
  try {
    const deals = await withDb((db) => pg.loadTestBusinessDeals(db, now));
    testDealsCache = { at: now, deals };
    return deals;
  } catch {
    return [];
  }
});

/** What decides whether a business page is indexed, beyond its live deals
 *  (lib/businessIndexing.ts). On a failed read, as if it had none: the
 *  page is left out of search for now rather than guessed in. */
export const fetchBusinessIndexFacts = cache(async (businessId: string): Promise<{ recentDeals: number; hasAddress: boolean }> => {
  try {
    return await withDb((db) => pg.businessIndexFacts(db, businessId));
  } catch {
    return { recentDeals: 0, hasAddress: false };
  }
});

export interface BusinessProfile extends PublicBusiness {
  id: string;
}

/**
 * Full business profile + all of their currently-live deals, for the
 * /business/[slug] page. Only public-safe fields are returned (no email,
 * no credits balance, no application status).
 *
 * Wrapped in React's cache() so the page and its generateMetadata share
 * one read, as on the deal page.
 */
export const fetchBusinessProfileBySlug = cache((slug: string) =>
  retryUnlessMissing("business profile", slug, loadBusinessProfileBySlug)
);

async function loadBusinessProfileBySlug(
  slugParam: string
): Promise<{ business: BusinessProfile; deals: Deal[] } | null> {
  // Readable addresses (business name and suburb). Old ones are
  // redirected before this runs (pageLookup below). Its deals come from
  // the site-wide listing, started alongside the business read.
  const liveDeals = fetchAllLiveDealsServer();
  const business = await withDb((db) => pg.readBusinessBySlug(db, slugParam));
  if (!business) return null;
  return { business, deals: (await liveDeals).filter((d) => d.businessSlug === business.slug) };
}

/**
 * All approved business profiles, for the sitemap and IndexNow, with when
 * each profile last changed. `email` lets the sitemap also date a
 * business page by its newest deal.
 */
export async function fetchAllBusinessSlugsForSitemap(): Promise<
  { slug: string; email: string; updatedAt: string | null; bio: string | null; photos: number; hasAddress: boolean; recentDeals: number }[]
> {
  try {
    return await withDb((db) => pg.listBusinessesForSitemap(db));
  } catch {
    return [];
  }
}

/**
 * All publicly live deals, for the sitemap and IndexNow: slug, when it
 * last changed, its categories and whose it is.
 *
 * `updatedAt` moves whenever the page does: Bing in particular leans on
 * these dates to decide what to recrawl.
 */
export async function fetchAllLiveDealSlugsForSitemap(): Promise<
  { slug: string; updatedAt: string | null; categories: string[]; merchantEmail: string; image: string | null }[]
> {
  try {
    return await withDb((db) => pg.listLiveDealsForSitemap(db));
  } catch {
    return [];
  }
}

/**
 * A deal for the admin's preview, whatever its status — pending, paused,
 * cancelled or expired — built exactly as the public page builds it, so
 * the preview shows what customers will see. Admin-only: callers must
 * check the admin session first.
 */
export async function fetchDealForAdminPreview(
  dealId: string
): Promise<{ deal: Deal; record: Record<string, any> } | null> {
  try {
    return await withDb((db) => pg.readDealForAdmin(db, dealId));
  } catch (err) {
    console.error("[fetchDealForAdminPreview] failed", err);
    return null;
  }
}

/**
 * What a deal or business address should answer before its page starts:
 * a permanent redirect to where it lives now (an old address), "missing"
 * for a real 404, or neither (show the page). Asked by the pages' layouts,
 * which run before the page starts streaming: from
 * inside the stream a redirect can only be a refresh and a "not found" is
 * sent with status 200, neither of which search engines treat as meant.
 *
 * The page's own reads are the same cached calls, so it doesn't read twice.
 */
export const pageLookup = cache(
  async (kind: "deal" | "business", slug: string): Promise<{ redirect: string | null; missing: boolean }> => {
    const show = { redirect: null, missing: false };
    try {
      const found = kind === "deal" ? (await fetchDealForSEO(slug)) ?? (await fetchEndedDeal(slug)) : await fetchBusinessProfileBySlug(slug);
      if (found) return show;
      const redirect = await withDb((db) => (kind === "deal" ? pg.resolveDealRedirect(db, slug) : pg.resolveBusinessRedirect(db, slug)));
      return { redirect, missing: !redirect };
    } catch (err) {
      // A failed read isn't "not found": the page shows its usual error.
      console.error("[pageLookup] failed", kind, slug, err);
      return show;
    }
  }
);
