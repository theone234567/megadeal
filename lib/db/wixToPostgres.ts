import { createHash } from "crypto";
import { CATEGORIES } from "../categories";

/**
 * Turns exported Wix records into rows for the new database
 * (supabase/migrations). Pure functions: no network, no database, so the
 * whole conversion is tested on its own (wixToPostgres.test.ts) and can be
 * re-run as often as needed before the switch.
 *
 * Nothing is dropped silently. Anything that doesn't fit the new rules
 * (a malformed link, an unknown status, a missing category) is either
 * corrected in an obvious way or left out of the row and reported in
 * `issues`, with the original value, for a person to look at.
 */

export type Issue = { record: string; field: string; problem: string; value?: unknown };

type Row = Record<string, unknown>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.trunc(n);
}

function date(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** A JSON value stored either as an object or as JSON text, as Wix holds
 *  both. Unparseable text is reported and dropped. */
function json(value: unknown, issues: Issue[], record: string, field: string): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    issues.push({ record, field, problem: "not valid JSON, left out", value });
    return null;
  }
}

/** sha-256 hex: how the new database stores email tokens. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * A stored link as the site renders it (lib/socialLinks.ts safeWebHref):
 * "https://" added when no scheme was typed, then only http(s) kept.
 */
export function normaliseUrl(value: unknown, issues: Issue[], record: string, field: string): string | null {
  const raw = str(value);
  if (!raw) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if ((url.protocol === "https:" || url.protocol === "http:") && !/\s/.test(candidate)) return candidate;
  } catch {
    // reported below
  }
  issues.push({ record, field, problem: "not an http(s) link, left out", value: raw });
  return null;
}

const SLUG_BY_NAME = new Map<string, string>();
const SLUG_BY_WIX_ID = new Map<string, string>();
for (const c of CATEGORIES) {
  SLUG_BY_NAME.set(c.name.toLowerCase(), c.slug);
  SLUG_BY_NAME.set(c.slug, c.slug);
  if (c.id) SLUG_BY_WIX_ID.set(c.id, c.slug);
}

/** A category name, slug or Wix category id → the category's slug. */
export function categorySlug(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  return SLUG_BY_NAME.get(raw.toLowerCase()) ?? SLUG_BY_WIX_ID.get(raw) ?? null;
}

const MERCHANT_STATUSES = new Set(["Pending", "Approved", "Suspended"]);

/** A Wix Merchants item → a merchants row. `owner_id` is set later, when
 *  logins move (the Wix member id isn't a Supabase user id). */
export function mapMerchant(item: Row, issues: Issue[]): Row {
  const record = `merchant ${str(item._id) || "?"} (${str(item.businessName) || "no name"})`;

  const email = str(item.email).toLowerCase();
  if (!EMAIL_RE.test(email)) issues.push({ record, field: "email", problem: "missing or invalid email", value: item.email });

  let status = str(item.status);
  if (!MERCHANT_STATUSES.has(status)) {
    issues.push({ record, field: "status", problem: "unknown status, set to Pending", value: item.status });
    status = "Pending";
  }

  let credits = int(item.creditsBalance) ?? 0;
  if (credits < 0) {
    issues.push({ record, field: "creditsBalance", problem: "negative balance, set to 0", value: item.creditsBalance });
    credits = 0;
  }

  const rawCategory = str(item.category);
  const category = categorySlug(rawCategory);
  if (rawCategory && !category) issues.push({ record, field: "category", problem: "unknown category, left out", value: rawCategory });

  const nzbn = str(item.nzbn).replace(/\s/g, "");
  if (nzbn && !/^\d{13}$/.test(nzbn)) issues.push({ record, field: "nzbn", problem: "not 13 digits, left out", value: item.nzbn });

  const priceRange = str(item.priceRange);
  const photos = json(item.photos, issues, record, "photos");

  return {
    wix_id: orNull(str(item._id)),
    email,
    email_verified: Boolean(item.emailVerified),
    legal_business_name: orNull(str(item.legalBusinessName)),
    nzbn: /^\d{13}$/.test(nzbn) ? nzbn : null,
    contact_name: orNull(str(item.contactName)),
    contact_phone: orNull(str(item.contactPhone)),
    postcode: orNull(str(item.postcode)),
    coupon_code: orNull(str(item.couponCode)),
    referral_code: orNull(str(item.referralCode)),
    referred_by_code: orNull(str(item.referredByCode).toUpperCase()),
    referral_rewarded: Boolean(item.referralRewarded),
    promo_rewarded: Boolean(item.promoRewarded),
    notify_referral_bonus: Boolean(item.notifyReferralBonus),
    rudeness_check: json(item.rudenessCheck, issues, record, "rudenessCheck"),
    credits_balance: credits,
    status,
    first_approved_at: date(item.firstApprovedAt),
    business_name: str(item.businessName) || "(unnamed business)",
    category_slug: category,
    bio: orNull(str(item.bio)),
    phone: orNull(str(item.phone)),
    website: normaliseUrl(item.website, issues, record, "website"),
    booking_url: normaliseUrl(item.bookingUrl, issues, record, "bookingUrl"),
    booking_email: EMAIL_RE.test(str(item.bookingEmail)) ? str(item.bookingEmail) : null,
    facebook_url: normaliseUrl(item.facebookUrl, issues, record, "facebookUrl"),
    instagram_url: normaliseUrl(item.instagramUrl, issues, record, "instagramUrl"),
    address: orNull(str(item.address)),
    suburb: orNull(str(item.suburb)),
    city: orNull(str(item.city)),
    lat: num(item.lat),
    lng: num(item.lng),
    business_hours: orNull(str(item.businessHours)),
    price_range: ["", "$", "$$", "$$$", "$$$$"].includes(priceRange) ? priceRange : null,
    amenities: str(item.amenities)
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
    logo_url: normaliseUrl(item.logoUrl, issues, record, "logoUrl"),
    photos: Array.isArray(photos) ? photos.filter((p) => typeof p === "string" && p) : [],
    rating: num(item.rating),
    review_count: int(item.reviewCount),
    default_booking_requirement: ["", "required", "recommended", "not_required"].includes(str(item.defaultBookingRequirement))
      ? str(item.defaultBookingRequirement)
      : null,
    // Left out when Wix has no date, so the database's default (now) applies.
    created_at: date(item._createdDate) ?? undefined,
  };
}

const DEAL_STATUSES = new Set(["Draft", "Pending Approval", "Live", "Paused", "Cancelled"]);
const BOOKING = new Set(["required", "recommended", "not_required", "unknown"]);

/** The deal price and original price on a Wix Stores product (same
 *  reading as lib/mapDeal.ts). */
function productPrices(product: Row | null): { now: number | null; was: number | null } {
  if (!product) return { now: null, was: null };
  const variant = (product as any)?.variantsInfo?.variants?.[0];
  const price = variant?.price ?? {
    actualPrice: (product as any)?.actualPriceRange?.minValue,
    compareAtPrice: (product as any)?.compareAtPriceRange?.minValue,
  };
  return { now: num(price?.actualPrice?.amount), was: num(price?.compareAtPrice?.amount) };
}

/**
 * A Wix Deals item and its Stores product (null for a draft) → a deals
 * row. `merchantIdByEmail` maps each business's email (lower case) to its
 * new merchants id.
 */
export function mapDeal(item: Row, product: Row | null, merchantIdByEmail: Map<string, string>, issues: Issue[]): Row | null {
  const record = `deal ${str(item._id) || "?"} (${str(item.dealName) || "no name"})`;

  const merchantId = merchantIdByEmail.get(str(item.merchantEmail).toLowerCase());
  if (!merchantId) {
    issues.push({ record, field: "merchantEmail", problem: "no business with this email, deal not imported", value: item.merchantEmail });
    return null;
  }

  let status = str(item.status);
  if (!DEAL_STATUSES.has(status)) {
    // A product with no status reads as live on today's site (isDealLive).
    const fallback = product ? "Live" : "Draft";
    issues.push({ record, field: "status", problem: `missing or unknown status, set to ${fallback}`, value: item.status });
    status = fallback;
  }

  const prices = productPrices(product);
  const priceNow = num(item.priceNow) ?? prices.now;
  let priceWas = num(item.priceWas) ?? prices.was ?? priceNow;
  if (priceNow !== null && priceWas !== null && priceWas < priceNow) {
    issues.push({ record, field: "priceWas", problem: "original price below deal price, set equal", value: priceWas });
    priceWas = priceNow;
  }

  // Category: the product's (a Wix category id), else the deal's own field.
  const productCategories: unknown[] = (product as any)?.allCategoriesInfo?.categories?.map((c: any) => c?.id ?? c?.name) ?? [];
  const category =
    productCategories.map(categorySlug).find((s): s is string => Boolean(s)) ?? categorySlug(item.category) ?? null;
  if (status !== "Draft" && !category) issues.push({ record, field: "category", problem: "no known category on a submitted deal" });

  const slug = str((product as any)?.slug) || null;
  if (status !== "Draft" && !slug) issues.push({ record, field: "slug", problem: "submitted deal has no product address" });

  const booking = str(item.bookingRequirement);
  const productImage =
    (product as any)?.media?.main?.image?.url || (product as any)?.media?.main?.url || (product as any)?.media?.itemsInfo?.items?.[0]?.image?.url || null;

  return {
    wix_id: orNull(str(item._id)),
    wix_product_id: orNull(str(item.productId)) ?? orNull(str((product as any)?.id)),
    merchant_id: merchantId,
    slug,
    name: str(item.dealName) || str((product as any)?.name),
    description: str(item.description),
    category_slug: category,
    photo_url: normaliseUrl(item.photoUrl || productImage, issues, record, "photoUrl"),
    price_now: priceNow,
    price_was: priceWas,
    ribbon: orNull(str((product as any)?.ribbon?.name)),
    terms: orNull(str(item.terms)),
    quantity_available: int(item.quantityAvailable),
    is_flash: Boolean(item.isFlash),
    status,
    // Wix doesn't record who paused a deal. Assume the business did, so it
    // can still resume its own pause after the move; any admin pauses
    // are listed for a person to re-apply.
    paused_by: status === "Paused" ? "business" : null,
    status_note: orNull(str(item.statusNote)),
    booking_requirement: BOOKING.has(booking) ? booking : null,
    deal_code: orNull(str(item.dealCode)),
    code_on_website: typeof item.codeOnWebsite === "boolean" ? item.codeOnWebsite : null,
    code_website_url: normaliseUrl(item.codeWebsiteUrl, issues, record, "codeWebsiteUrl"),
    credits_charged: Math.max(0, int(item.creditsCharged) ?? 0),
    credit_refunded: Boolean(item.creditRefunded),
    requested_duration_minutes: int(item.requestedDurationMinutes) || null,
    scheduled_start_at: date(item.scheduledStartAt),
    first_approved_at: date(item.firstApprovedAt),
    first_published_at: date(item.firstPublishedAt),
    expires_at: date(item.expiresAt),
    ever_live: Boolean(item.everLive),
    pending_revision: json(item.pendingRevision, issues, record, "pendingRevision"),
    pending_photo_url: normaliseUrl(item.pendingPhotoUrl, issues, record, "pendingPhotoUrl"),
    pending_photo_review: json(item.pendingPhotoReview, issues, record, "pendingPhotoReview"),
    ai_review: json(item.aiReview, issues, record, "aiReview"),
    content_history: (() => {
      const h = json(item.contentHistory, issues, record, "contentHistory");
      return Array.isArray(h) ? h : [];
    })(),
    draft_data: json(item.draftData, issues, record, "draftData"),
    draft_revision: Math.max(0, int(item.draftRevision) ?? 0),
    is_test: Boolean(item.isTest),
    view_count: Math.max(0, int(item.viewCount) ?? 0),
    click_count: Math.max(0, int(item.clickCount) ?? 0),
    code_copy_count: Math.max(0, int(item.codeCopyCount) ?? 0),
    website_click_count: Math.max(0, int(item.websiteClickCount) ?? 0),
    call_click_count: Math.max(0, int(item.callClickCount) ?? 0),
    email_click_count: Math.max(0, int(item.emailClickCount) ?? 0),
    directions_click_count: Math.max(0, int(item.directionsClickCount) ?? 0),
    // Left out when Wix has no date, so the database's default (now) applies.
    created_at: date(item._createdDate) ?? undefined,
  };
}

/** A Wix EmailSignups item → an email_signups row, its tokens hashed. */
export function mapEmailSignup(item: Row, issues: Issue[]): Row | null {
  const record = `email signup ${str(item._id) || "?"}`;
  const email = str(item.email).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    issues.push({ record, field: "email", problem: "invalid email, not imported", value: item.email });
    return null;
  }
  const audience = str(item.audience) || "customer";
  if (audience !== "customer" && audience !== "merchant") {
    issues.push({ record, field: "audience", problem: "unknown audience, not imported", value: item.audience });
    return null;
  }
  const verifyToken = str(item.verifyToken);
  const unsubscribeToken = str(item.unsubscribeToken);
  return {
    wix_id: orNull(str(item._id)),
    email,
    audience,
    source: orNull(str(item.source)),
    verified: Boolean(item.verified),
    verify_token_hash: verifyToken ? hashToken(verifyToken) : null,
    unsubscribed: Boolean(item.unsubscribed),
    unsubscribe_token_hash: unsubscribeToken ? hashToken(unsubscribeToken) : null,
    // Left out when Wix has no date, so the database's default (now) applies.
    created_at: date(item._createdDate) ?? undefined,
  };
}

/** A Wix MerchantActivity item → a merchant_activity row. */
export function mapActivity(item: Row, merchantIdByEmail: Map<string, string>, issues: Issue[]): Row | null {
  const record = `activity ${str(item._id) || "?"}`;
  const merchantId = merchantIdByEmail.get(str(item.merchantEmail).toLowerCase());
  if (!merchantId) {
    issues.push({ record, field: "merchantEmail", problem: "no business with this email, not imported", value: item.merchantEmail });
    return null;
  }
  let type = str(item.type);
  if (type !== "credit" && type !== "deal") {
    issues.push({ record, field: "type", problem: "unknown type, set to deal", value: item.type });
    type = "deal";
  }
  return {
    merchant_id: merchantId,
    type,
    amount: int(item.amount),
    description: str(item.description) || "(no description)",
    // Left out when Wix has no date, so the database's default (now) applies.
    created_at: date(item._createdDate) ?? undefined,
  };
}
