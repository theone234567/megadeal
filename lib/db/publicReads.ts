import { businessSlug } from "../slug";
import { businessSuburb } from "../location";
import { MAX_BUSINESS_PHOTOS } from "../businessPhotos";
import { parseBookingRequirement } from "../booking";
import { CATEGORIES } from "../categories";
import { isDealLive } from "../dealVisibility";
import type { PublicBusiness } from "../business";
import type { Deal, DealStatus } from "../types";
import type { Sql } from "./connection";

/**
 * The storefront's reads from MegaDeal's own database: the same Deal and
 * PublicBusiness shapes lib/fetchDealServer.ts builds from Wix, so the
 * pages can't tell which one they came from (publicReads.test.ts checks
 * the two agree, field for field).
 *
 * Only public columns are selected, and only approved businesses' deals
 * are returned, the same rules as the Wix reads and the public_deals view.
 */

const CATEGORY_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.name]));

// Public business columns, prefixed b_ so they sit beside a deal's.
const BUSINESS_COLUMNS = `
  m.id as b_id, m.slug_id as b_slug_id, m.business_name as b_name, m.logo_url as b_logo_url,
  m.photos as b_photos, m.website as b_website, m.phone as b_phone, m.address as b_address,
  m.city as b_city, m.suburb as b_suburb, m.bio as b_bio, m.business_hours as b_hours,
  m.facebook_url as b_facebook_url, m.instagram_url as b_instagram_url,
  m.price_range as b_price_range, m.amenities as b_amenities, m.booking_url as b_booking_url,
  m.booking_email as b_booking_email, m.lat as b_lat, m.lng as b_lng,
  m.rating as b_rating, m.review_count as b_review_count`;

const DEAL_COLUMNS = `
  d.id, d.slug, d.name, d.description, d.category_slug, d.photo_url, d.price_now, d.price_was,
  d.ribbon, d.terms, d.quantity_available, d.is_flash, d.status, d.booking_requirement,
  d.deal_code, d.code_on_website, d.code_website_url, d.first_published_at, d.expires_at,
  d.ever_live, d.updated_at`;

type Row = Record<string, any>;

/** Postgres numbers can arrive as text (numeric, bigint); null stays null. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** timestamptz arrives as a Date (or text); pages expect ISO strings. */
function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function blankToNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** The business's public fields, from a row selected with BUSINESS_COLUMNS. */
export function rowToBusiness(r: Row): PublicBusiness {
  const photos = Array.isArray(r.b_photos) ? r.b_photos : typeof r.b_photos === "string" ? JSON.parse(r.b_photos) : [];
  return {
    businessName: r.b_name,
    logoUrl: blankToNull(r.b_logo_url),
    photos: photos.filter((p: unknown): p is string => typeof p === "string" && p.length > 0).slice(0, MAX_BUSINESS_PHOTOS),
    website: blankToNull(r.b_website),
    phone: blankToNull(r.b_phone),
    address: blankToNull(r.b_address),
    city: blankToNull(r.b_city),
    suburb: businessSuburb(r.b_suburb, r.b_address, r.b_city),
    slug: businessSlug(r.b_name, r.b_slug_id),
    bio: blankToNull(r.b_bio),
    businessHours: blankToNull(r.b_hours),
    facebookUrl: blankToNull(r.b_facebook_url),
    instagramUrl: blankToNull(r.b_instagram_url),
    priceRange: blankToNull(r.b_price_range),
    amenities: Array.isArray(r.b_amenities) ? r.b_amenities : [],
    bookingUrl: blankToNull(r.b_booking_url),
    bookingEmail: blankToNull(r.b_booking_email),
    lat: toNumber(r.b_lat),
    lng: toNumber(r.b_lng),
    rating: toNumber(r.b_rating),
    reviewCount: toNumber(r.b_review_count),
  };
}

/** A deal and its business, from a row selected with DEAL_COLUMNS and
 *  BUSINESS_COLUMNS. */
export function rowToDeal(r: Row): Deal {
  const now = toNumber(r.price_now) ?? 0;
  const was = toNumber(r.price_was) ?? now;
  const b = rowToBusiness(r);
  const category = CATEGORY_NAME_BY_SLUG[r.category_slug];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name ?? "",
    description: r.description ?? "",
    image: blankToNull(r.photo_url),
    now,
    was,
    formattedNow: null,
    formattedWas: null,
    discountPercent: was > now && was > 0 ? Math.round(100 - (now / was) * 100) : 0,
    currency: "NZD",
    ribbon: blankToNull(r.ribbon),
    categories: category ? [category] : [],
    variantId: null,
    inStock: r.quantity_available !== 0,
    quantityAvailable: typeof r.quantity_available === "number" ? r.quantity_available : null,
    expiresAt: toIso(r.expires_at),
    startsAt: toIso(r.first_published_at),
    status: (r.status as DealStatus) ?? null,
    isFlash: Boolean(r.is_flash),
    terms: blankToNull(r.terms),
    businessName: b.businessName,
    businessLogoUrl: b.logoUrl,
    businessWebsite: b.website,
    businessPhone: b.phone,
    businessAddress: b.address,
    businessCity: b.city,
    businessSuburb: b.suburb,
    businessSlug: b.slug,
    businessBio: b.bio,
    businessHours: b.businessHours,
    businessFacebookUrl: b.facebookUrl,
    businessInstagramUrl: b.instagramUrl,
    businessPriceRange: b.priceRange,
    businessAmenities: b.amenities,
    businessBookingUrl: b.bookingUrl,
    businessBookingEmail: b.bookingEmail,
    businessLat: b.lat,
    businessLng: b.lng,
    businessRating: b.rating,
    businessReviewCount: b.reviewCount,
    dealCode: blankToNull(r.deal_code),
    bookingRequirement: parseBookingRequirement(r.booking_requirement),
    codeOnWebsite: typeof r.code_on_website === "boolean" ? r.code_on_website : null,
    codeWebsiteUrl: blankToNull(r.code_website_url),
  };
}

/**
 * Every live deal from an approved business, whole (contact details and
 * code included, as the Wix listing keeps them; listings trim them on the
 * way out). Start and end times are checked here too, and again by the
 * caller as time passes.
 */
export async function loadLiveDeals(db: Sql, now: number = Date.now()): Promise<Deal[]> {
  const rows = await db.query(
    `select ${DEAL_COLUMNS}, ${BUSINESS_COLUMNS}
       from public.deals d
       join public.merchants m on m.id = d.merchant_id
      where d.status = 'Live' and not d.is_test and m.status = 'Approved'
      order by d.first_published_at desc nulls last, d.created_at desc`
  );
  return rows.map(rowToDeal).filter((d) => isDealLive(d, now));
}

export interface DealRead {
  deal: Deal;
  /** Showing on the site now. */
  live: boolean;
  /** Was ever published, so an ended page for it may be shown. */
  wasPublished: boolean;
}

/**
 * The deal behind an address, live or not, for the deal page and the
 * "this deal has ended" page. null when there's nothing public to show:
 * no such deal, a draft or one never published, a test deal, or a
 * business that isn't approved. Same rules as readDeal in
 * lib/fetchDealServer.ts.
 */
export async function readDealBySlug(db: Sql, slug: string, now: number = Date.now()): Promise<DealRead | null> {
  const [row] = await db.query(
    `select ${DEAL_COLUMNS}, ${BUSINESS_COLUMNS}
       from public.deals d
       join public.merchants m on m.id = d.merchant_id
      where d.slug = $1 and not d.is_test and m.status = 'Approved'`,
    [slug]
  );
  if (!row) return null;
  const deal = rowToDeal(row);
  const live = isDealLive(deal, now);
  const startsAt = deal.startsAt ? new Date(deal.startsAt).getTime() : NaN;
  const scheduledFuture = Number.isFinite(startsAt) && startsAt > now;
  const wasPublished = Boolean(row.first_published_at || row.ever_live) && !scheduledFuture;
  if (!live && !wasPublished) return null;
  return { deal, live, wasPublished };
}

/**
 * An approved business by the id prefix at the end of its page address
 * (lib/slug.ts), or null.
 */
export async function readBusinessBySlugId(db: Sql, slugId: string): Promise<(PublicBusiness & { id: string }) | null> {
  if (!/^[0-9a-f]{8}$/.test(slugId)) return null;
  const [row] = await db.query(
    `select ${BUSINESS_COLUMNS} from public.merchants m where m.slug_id = $1 and m.status = 'Approved'`,
    [slugId]
  );
  return row ? { id: row.b_id, ...rowToBusiness(row) } : null;
}

/** Every approved business's page, with when it last changed, for the
 *  sitemap. `email` is "" here: deals carry their business's slug. */
export async function listBusinessesForSitemap(db: Sql): Promise<{ slug: string; email: string; updatedAt: string | null }[]> {
  const rows = await db.query(
    `select m.business_name, m.slug_id, m.email, m.updated_at
       from public.merchants m where m.status = 'Approved' order by m.created_at`
  );
  return rows.map((r) => ({
    slug: businessSlug(r.business_name, r.slug_id),
    email: String(r.email || "").toLowerCase(),
    updatedAt: toIso(r.updated_at),
  }));
}

/** Every live deal's address, last change, category and business email,
 *  for the sitemap and IndexNow. */
export async function listLiveDealsForSitemap(
  db: Sql,
  now: number = Date.now()
): Promise<{ slug: string; updatedAt: string | null; categories: string[]; merchantEmail: string }[]> {
  const rows = await db.query(
    `select d.slug, d.updated_at, d.category_slug, d.status, d.first_published_at, d.expires_at, m.email
       from public.deals d
       join public.merchants m on m.id = d.merchant_id
      where d.status = 'Live' and not d.is_test and m.status = 'Approved' and d.slug is not null`
  );
  return rows
    .filter((r) => isDealLive({ status: r.status, startsAt: toIso(r.first_published_at), expiresAt: toIso(r.expires_at) }, now))
    .map((r) => ({
      slug: r.slug,
      updatedAt: toIso(r.updated_at),
      categories: CATEGORY_NAME_BY_SLUG[r.category_slug] ? [CATEGORY_NAME_BY_SLUG[r.category_slug]] : [],
      merchantEmail: String(r.email || "").toLowerCase(),
    }));
}

/**
 * A deal for the admin's preview, whatever its status or its business's,
 * built as the public page builds it. Admin-only: the caller checks the
 * admin session. `record` has the fields the preview page reads off the
 * Wix Deals row, under the same names.
 */
export async function readDealForAdmin(db: Sql, dealId: string): Promise<{ deal: Deal; record: Row } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId)) return null;
  const [row] = await db.query(
    `select ${DEAL_COLUMNS}, d.ai_review, ${BUSINESS_COLUMNS}
       from public.deals d join public.merchants m on m.id = d.merchant_id
      where d.id = $1`,
    [dealId]
  );
  // A draft has no page to preview yet (in Wix, no product).
  if (!row?.slug) return null;
  return { deal: rowToDeal(row), record: { status: row.status, aiReview: row.ai_review ?? null } };
}
