import "server-only";
import { cache } from "react";
import { createWixAdminClient } from "./wixAdmin";
import { mapProductToDeal, unwrapProduct } from "./mapDeal";
import { businessSlug } from "./slug";
import { CATEGORY_NAME_BY_ID, isMegaShopProduct } from "./categories";
import { mapMerchantToBusiness, applyBusinessToDeal, type PublicBusiness } from "./business";
import { isDealLive } from "./dealVisibility";
import { parseBookingRequirement } from "./booking";
import { queryAllItems } from "./queryAll";
import { searchAllProducts } from "./searchAllProducts";
import { toListingDeal } from "./listingDeal";
import { readEdgeCache, writeEdgeCache } from "./edgeCache";
import type { Deal, DealStatus } from "./types";

/** Overlays a deal's Deals row (status, dates, photo, terms, code…) on
 *  the fields mapped from its Stores product. */
function mergeDealRecord(deal: Deal, record: Record<string, any>): Deal {
  return {
    ...deal,
    expiresAt: record.expiresAt ?? null,
    status: record.status ?? null,
    image: record.photoUrl || deal.image,
    isFlash: Boolean(record.isFlash),
    // The Deals row keeps the business's own text. The product only
    // returns its HTML copy when PLAIN_DESCRIPTION is requested, which
    // this read doesn't, so the page's "What's included" came out blank.
    description: record.description || deal.description,
    // MegaDeal never takes payment: the business charges in NZ dollars,
    // whatever currency the Wix store happens to be set to.
    currency: "NZD",
    quantityAvailable:
      typeof record.quantityAvailable === "number" ? record.quantityAvailable : null,
    terms: record.terms || null,
    dealCode: record.dealCode || null,
    bookingRequirement: parseBookingRequirement(record.bookingRequirement),
  };
}

/**
 * Server-only lookup for a deal page (its metadata, JSON-LD and body).
 * Runs on the admin (API key) client, which has proven reliable in Node —
 * the visitor OAuth client's browser-only flakiness doesn't apply here.
 *
 * Wrapped in React's cache(): the page's generateMetadata and its body
 * both ask for the deal, and each lookup is three Wix reads in a row
 * (product, Deals row, business). Unwrapped, every click on a deal made
 * all three twice.
 *
 * null means the deal isn't there to show (no such product, not live, no
 * approved business) and the page answers "not found". A failed read is
 * different: it used to be swallowed into null too, so a Wix hiccup — or
 * Wix turning away a burst of requests — told the visitor a live deal
 * didn't exist ("This page has wandered off"). Now a failed read is tried
 * once more and, if it fails again, thrown, so the visitor gets the
 * "Something went sideways / Try again" page instead.
 *
 * Tried first: the deal from a listing read in the last minute (see
 * liveDealFromListing), which needs no Wix reads. Opening a deal from the
 * homepage used to wait for three Wix reads in a row every time.
 */
export const fetchDealForSEO = cache(
  async (slug: string) => (await liveDealFromListing(slug)) ?? retryUnlessMissing("deal", slug, loadDealForSEO)
);

/**
 * Runs a page's read, and once more after a short pause if it fails. A
 * Wix 404 means the thing doesn't exist, so it comes back as null (the
 * page's "not found"); any other failure that repeats is thrown, for the
 * page's error screen.
 */
async function retryUnlessMissing<T>(what: string, key: string, read: (key: string) => Promise<T | null>): Promise<T | null> {
  try {
    return await read(key);
  } catch (err) {
    if (isWixNotFound(err)) return null;
    console.error(`[${what}] read failed, retrying once`, key, err);
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      return await read(key);
    } catch (again) {
      if (isWixNotFound(again)) return null;
      throw again;
    }
  }
}

/** The Wix SDK puts the HTTP status on its errors; 404 is "no such thing". */
function isWixNotFound(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 404;
}

async function loadDealForSEO(slug: string): Promise<Deal | null> {
  const adminClient = createWixAdminClient();
  const res = await adminClient.productsV3.getProductBySlug(slug, {
    fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
  } as any);
  const product = (res as any).product;
  if (!product || isMegaShopProduct(product)) return null;

  let deal = mapProductToDeal(product, CATEGORY_NAME_BY_ID);

  const dealsResult = await adminClient.items
    .query("Deals")
    .eq("productId", deal.id)
    .find();
  const record = dealsResult.items?.[0];
  const merchantEmail: string | null = record?.merchantEmail || null;
  if (record) deal = mergeDealRecord(deal, record);

  // Same rule as the listing: no Deals row, no deal. Without this an
  // orphaned Stores product had its own public page, complete with
  // schema.org markup telling Google it was a real offer.
  if (!record) return null;
  if (!isDealLive(deal)) return null;

  if (merchantEmail) {
    const merchantResult = await adminClient.items
      .query("Merchants")
      .eq("email", merchantEmail)
      .find();
    const merchant = merchantResult.items?.[0];
    // Only an approved business's deals are public: a suspended one's,
    // and one waiting on re-approval after changing its name, legal
    // details, category or photos — otherwise the unreviewed name and
    // photos would go straight onto its live deals.
    if (merchant?.status !== "Approved") return null;
    if (merchant.businessName && merchant._id) {
      deal = applyBusinessToDeal(deal, mapMerchantToBusiness(merchant));
    }
  } else {
    // A deal with no business behind it isn't one we can show.
    return null;
  }

  return deal;
}

/**
 * All currently-live deals with business info applied, server-rendered —
 * this is what backs the homepage, category pages, and flash deals list,
 * so the actual deal listings are present in the raw HTML a crawler gets
 * on first request instead of only appearing after client-side JS fetches
 * them. Same admin-client reliability story as fetchDealForSEO above, and
 * mirrors the shape lib/fetchDeals.ts's client-side fetchDeals() produces
 * exactly (same mapProductToDeal/applyBusinessToDeal/isDealLive calls) so
 * every consumer can keep working with the result identically either way.
 *
 * Wrapped in React's cache() so a page and its generateMetadata (the
 * category page needs the count for its robots tag) share one read.
 */
export const fetchAllLiveDealsServer = cache(fetchAllLiveDeals);

// The pages behind this read the query string, which makes them render on
// every request — their `revalidate` never applied, and there's no
// persistent cache configured on Cloudflare (open-next.config.ts). So
// every homepage view was a fresh read of every product, deal and business
// from Wix: slow for the visitor, and anyone reloading the page fast
// enough could run the site into Wix's rate limit. Kept for a minute
// instead: in this server instance's memory, and in the data centre's
// shared cache (lib/edgeCache.ts) so the site's other instances there can
// use it too. Only resolved plain data is kept — never a promise, which a
// Worker can't share between requests.
const LISTING_FRESH_MS = 60 * 1000;
// If Wix fails, a recent copy is served rather than an empty page: an
// empty listing would show "no deals" and mark every category page
// noindex, and a crawler arriving then would take both at face value.
const LISTING_STALE_MS = 15 * 60 * 1000;
// Bump when the shape of a stored Deal changes, so a deploy never reads a
// copy stored by the previous version.
const LISTING_CACHE_KEY = "live-deals-v1";

// The deals are kept whole — contact details, deal code and all — so the
// deal page can use them (fetchDealForSEO). Listings get them trimmed by
// toListingDeal on the way out.
type Listing = { at: number; deals: Deal[] };
let lastListing: Listing | null = null;

/** A copy of the listing no older than a minute, without reading Wix. */
async function freshListing(now: number): Promise<Listing | null> {
  if (lastListing && now - lastListing.at < LISTING_FRESH_MS) return lastListing;
  const shared = await readEdgeCache<Deal[]>(LISTING_CACHE_KEY);
  if (shared && now - shared.at < LISTING_FRESH_MS) {
    lastListing = { at: shared.at, deals: shared.value };
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
    const deals = await loadAllLiveDeals();
    lastListing = { at, deals };
    await writeEdgeCache(LISTING_CACHE_KEY, deals, at, LISTING_STALE_MS / 1000);
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
  return listing.deals.filter((d) => isDealLive(d, now)).map(toListingDeal);
}

/**
 * A deal straight from a listing read in the last minute, if it's in it:
 * the listing already holds every live deal whole (product, Deals row and
 * approved business, built the same way as loadDealForSEO), so opening a
 * deal from the homepage needs no Wix reads at all. null when there's no
 * fresh listing or the deal isn't in it (new in the last minute, or not
 * live), and the caller reads Wix as before.
 */
async function liveDealFromListing(slug: string): Promise<Deal | null> {
  const now = Date.now();
  const listing = await freshListing(now);
  const deal = listing?.deals.find((d) => d.slug === slug);
  return deal && isDealLive(deal, now) ? deal : null;
}

/** One full read of the listing from Wix. Throws on failure — the
 *  caller decides what to serve instead. */
async function loadAllLiveDeals(): Promise<Deal[]> {
  const adminClient = createWixAdminClient();
  const [productsRes, dealsResult, merchantsResult] = await Promise.all([
    searchAllProducts(
      adminClient,
      ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
      "deal listing"
    ),
    // Drafts have no productId and every join below is by productId, so
    // they could never match — but an unbounded find() returns a default
    // page of rows, and drafts accumulating in that page would push real
    // deals out of it. Filtering on the field the join actually needs is
    // exact and can't drop a legitimate row: anything without a
    // productId was already unusable here.
    adminClient.items.query("Deals").isNotEmpty("productId").limit(500).find(),
    queryAllItems(() => adminClient.items.query("Merchants"), "Merchants (deal listing)"),
  ]);

  const products = productsRes.filter((p: any) => !isMegaShopProduct(p));

  const metaByProductId: Record<string, any> = {};
  for (const item of dealsResult.items ?? []) {
    if (item.productId) metaByProductId[item.productId] = item;
  }

  // Only approved businesses' deals are listed. Suspending a business
  // takes its deals off the site; so does a change that sends it back
  // for re-approval (name, legal details, category, photos), until an
  // admin has looked at it — see fetchDealForSEO.
  const businessByEmail: Record<string, PublicBusiness> = {};
  for (const m of merchantsResult) {
    if (m.status === "Approved" && m.email && m.businessName && m._id) {
      businessByEmail[String(m.email).toLowerCase()] = mapMerchantToBusiness(m);
    }
  }

  return products
    .map((p: any) => mapProductToDeal(p, CATEGORY_NAME_BY_ID))
    .map((deal: Deal) => {
      const meta = metaByProductId[deal.id];
      // A product with no Deals row is not a MegaDeal deal. It used to
      // be returned as-is, and mapProductToDeal leaves status null,
      // which isDealLive reads as live — so such a product went straight
      // onto the site with no approval and no business attached to it.
      //
      // That is reachable: /api/deals/create makes the Wix Stores
      // product first and writes the Deals row second, so a failure
      // between the two leaves an orphan that publishes itself. It also
      // meant deleting a Deals row in the Wix dashboard silently
      // republished the product it belonged to.
      //
      // The Deals collection is what defines a deal here; Stores is only
      // the catalogue behind it. No row, nothing to show.
      if (!meta) return null;
      if (!meta.merchantEmail || !businessByEmail[String(meta.merchantEmail).toLowerCase()]) return null;
      return {
        ...deal,
        expiresAt: meta.expiresAt ?? null,
        status: meta.status ?? null,
        image: meta.photoUrl || deal.image,
        isFlash: Boolean(meta.isFlash),
        description: meta.description || deal.description,
        currency: "NZD",
        quantityAvailable:
          typeof meta.quantityAvailable === "number" ? meta.quantityAvailable : null,
        dealCode: meta.dealCode || null,
        // Cards show a short restriction summary drawn from the terms, so
        // listings need them too — they were only mapped on deal pages.
        terms: meta.terms || null,
        bookingRequirement: parseBookingRequirement(meta.bookingRequirement),
      };
    })
    .filter((deal: Deal | null): deal is Deal => deal !== null && isDealLive(deal))
    .map((deal: Deal) => {
      const meta = metaByProductId[deal.id];
      const business = meta?.merchantEmail
        ? businessByEmail[String(meta.merchantEmail).toLowerCase()]
        : undefined;
      return business ? applyBusinessToDeal(deal, business) : deal;
    });
}

export interface BusinessProfile extends PublicBusiness {
  id: string;
}

/**
 * Full business profile + all of their currently-live deals, for the
 * /business/[slug] page. Server-only, admin-client-backed for the same
 * reliability reasons as fetchDealForSEO — this never touches the flaky
 * visitor OAuth client. Only public-safe fields are returned (no email,
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
  const idPrefix = slugParam.split("-").pop();
  if (!idPrefix || !/^[0-9a-f]{8}$/.test(idPrefix)) return null;

  const adminClient = createWixAdminClient();
  // Started now, alongside the business read below; it's the same
  // cached listing the homepage uses, so it's often already in memory.
  const liveDeals = fetchAllLiveDealsServer();
  // Paged: this scans for one merchant by id prefix, and a single
  // default page of 50 meant every business past the 50th got a 404 on
  // their own public profile.
  const merchants = await queryAllItems(
    () => adminClient.items.query("Merchants"),
    "Merchants (business profile)"
  );
  const merchant = merchants.find(
    (m: any) => typeof m._id === "string" && m._id.startsWith(idPrefix)
  );
  // Public only once an admin has approved the business: a signup that
  // hasn't been reviewed (or one that's been suspended) has no page.
  if (!merchant || !merchant.businessName || merchant.status !== "Approved") {
    return null;
  }

  const business: BusinessProfile = {
    id: merchant._id,
    ...mapMerchantToBusiness(merchant),
  };

  // Its deals, from the site-wide listing: the same live, approved-
  // business deals the homepage shows, already built. This used to read
  // the business's Deals rows and then fetch each deal's product one
  // after another — sixteen deals was sixteen Wix reads in a row before
  // the page could show anything. The page only shows them as cards,
  // which is exactly what the listing holds.
  const deals = (await liveDeals).filter((d) => d.businessSlug === business.slug);

  return { business, deals };
}

/** Latest of several Wix timestamps (Date objects or ISO strings), as ISO. */
function latestIso(...values: unknown[]): string | null {
  let best = 0;
  for (const v of values) {
    const t = v ? new Date(v as string | Date).getTime() : NaN;
    if (Number.isFinite(t) && t > best) best = t;
  }
  return best ? new Date(best).toISOString() : null;
}

/**
 * All approved business profiles, for the sitemap and IndexNow, with when
 * each profile last changed. `email` lets the sitemap also date a
 * business page by its newest deal.
 */
export async function fetchAllBusinessSlugsForSitemap(): Promise<
  { slug: string; email: string; updatedAt: string | null }[]
> {
  try {
    const adminClient = createWixAdminClient();
    // Paged: an unpaged read capped the sitemap at 50 businesses, so
    // every business past that was never submitted to Google at all.
    const merchants = await queryAllItems(
      () => adminClient.items.query("Merchants"),
      "Merchants (sitemap)"
    );
    return merchants
      .filter((m: any) => m.businessName && m._id && m.status === "Approved")
      .map((m: any) => ({
        slug: businessSlug(m.businessName, m._id),
        email: String(m.email || "").toLowerCase(),
        updatedAt: latestIso(m._updatedDate),
      }));
  } catch {
    return [];
  }
}

/**
 * All publicly live deals, for the sitemap and IndexNow: slug, when it
 * last changed, its categories and whose it is.
 *
 * `updatedAt` is the later of the Stores product's and the Deals row's
 * update times — a changed description, conditions or photo only touches
 * the row. Bing in particular leans on these dates to decide what to
 * recrawl, so they need to move when the page does.
 */
export async function fetchAllLiveDealSlugsForSitemap(): Promise<
  { slug: string; updatedAt: string | null; categories: string[]; merchantEmail: string }[]
> {
  try {
    const adminClient = createWixAdminClient();
    const [allProducts, dealsResult, merchants] = await Promise.all([
      searchAllProducts(adminClient, ["ALL_CATEGORIES_INFO"], "sitemap"),
      // Same reasoning as above: filter to rows the productId join can use.
      adminClient.items.query("Deals").isNotEmpty("productId").limit(500).find(),
      queryAllItems(() => adminClient.items.query("Merchants"), "Merchants (sitemap deals)"),
    ]);
    const products = allProducts.filter((p: any) => !isMegaShopProduct(p));

    // Only approved businesses' deals have pages (see fetchDealForSEO),
    // so only those are advertised here.
    const approved = new Set(
      merchants
        .filter((m: any) => m.status === "Approved" && m.email)
        .map((m: any) => String(m.email).toLowerCase())
    );

    const rowByProductId: Record<string, any> = {};
    for (const item of dealsResult.items ?? []) {
      if (item.productId) rowByProductId[item.productId] = item;
    }

    return products
      .map((p: any) => ({ p, row: rowByProductId[p.id ?? p._id] }))
      .filter(({ row }: { row: any }) => {
        // `!row ||` used to pass products with no Deals row, which is the
        // opposite of what the listing and the detail page now do — so the
        // sitemap and IndexNow were handing Google URLs that 404. A product
        // with no row is not a deal here, and must not be advertised as one.
        if (!row) return false;
        if (!isDealLive({ status: (row.status as DealStatus) ?? null, expiresAt: row.expiresAt ?? null })) return false;
        return approved.has(String(row.merchantEmail || "").toLowerCase());
      })
      .map(({ p, row }: { p: any; row: any }) => ({
        slug: p.slug ?? p.id ?? p._id,
        updatedAt: latestIso(p.updatedDate, row._updatedDate),
        categories: (p.allCategoriesInfo?.categories ?? [])
          .map((c: any) => CATEGORY_NAME_BY_ID[c?.id])
          .filter(Boolean) as string[],
        merchantEmail: String(row.merchantEmail || "").toLowerCase(),
      }))
      .filter((d: { slug: string | undefined }) => Boolean(d.slug));
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
    const adminClient = createWixAdminClient();
    const record = await adminClient.items.get("Deals", dealId);
    if (!record?.productId) return null;
    const res = await adminClient.productsV3.getProduct(record.productId, {
      fields: ["MEDIA_ITEMS_INFO", "CURRENCY", "ALL_CATEGORIES_INFO"],
    } as any);
    const product = unwrapProduct(res);
    if (!product) return null;
    let deal = mergeDealRecord(mapProductToDeal(product, CATEGORY_NAME_BY_ID), record);
    if (record.merchantEmail) {
      const merchantResult = await adminClient.items.query("Merchants").eq("email", record.merchantEmail).find();
      const merchant = merchantResult.items?.[0];
      if (merchant?.businessName && merchant._id) {
        deal = applyBusinessToDeal(deal, mapMerchantToBusiness(merchant));
      }
    }
    return { deal, record };
  } catch (err) {
    console.error("[fetchDealForAdminPreview] failed", err);
    return null;
  }
}
