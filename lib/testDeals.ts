import { isBookingChoice, parseBookingRequirement } from "./booking";
import { CATEGORIES } from "./categories";
import { dealCodeError, normaliseDealCode } from "./dealCode";
import { EMPTY_DRAFT, type DealDraftData } from "./dealDraft";
import { parseTerms } from "./dealTerms";
import { EVERYDAY_MAX_DAYS, FLASH_MAX_MINUTES } from "./dealDuration";
import type { Deal } from "./types";

/**
 * Admin test deals (handoff pack, FINAL-SPEC §8): Everyday and Flash deals
 * only an admin can see, on the private homepage, category, Flash and deal
 * previews, with a timer that can be restarted. Pure rules only; stored by
 * lib/testDealStore.ts.
 *
 * Kept entirely apart from real deals: never in Wix (no product, no Deals
 * row), so nothing public can list them, and they have no credits, stock
 * or analytics. They ignore the Everyday/Flash switches in Platform
 * settings, so a type that's switched off for businesses can still be
 * tried out. "Copy to real draft" is the only way one becomes real: an
 * ordinary draft for a business you pick, with a new id and code, that
 * still has to be submitted and approved like any other.
 */

export const TEST_DEAL_LIMIT = 20;
export const TEST_DEAL_PREFIX = "test-";

/** Photos a test deal can use: the site's own illustrations (no upload,
 *  so nothing lands in the real media library). */
export const TEST_DEAL_PHOTOS = [
  { label: "Food & Drink", src: "/megadeal-coming-soon/food-drink-v1.webp" },
  { label: "Beauty & Spa", src: "/megadeal-coming-soon/beauty-spa-v1.webp" },
  { label: "Massage", src: "/megadeal-coming-soon/example-massage-v1.webp" },
  { label: "Things To Do", src: "/megadeal-coming-soon/things-to-do-v1.webp" },
  { label: "Travel & Getaways", src: "/megadeal-coming-soon/travel-getaways-v1.webp" },
  { label: "Health & Fitness", src: "/megadeal-coming-soon/health-fitness-v1.webp" },
  { label: "Home & Car", src: "/megadeal-coming-soon/home-car-v1.webp" },
] as const;

export interface TestDealFields {
  isFlash: boolean;
  /** Flash: minutes. Everyday: whole days, stored as minutes too. */
  durationMinutes: number;
  name: string;
  description: string;
  terms: string;
  category: string;
  priceNow: number;
  priceWas: number;
  photo: string;
  businessName: string;
  suburb: string;
  bookingRequirement: string;
  /** "" shows the example MEGA code. */
  dealCode: string;
}

export interface TestDeal extends TestDealFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** When the timer last (re)started. The deal ends durationMinutes later. */
  startedAt: string;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/**
 * Builds a test deal's fields from untrusted input (the admin form). Every
 * field is checked; problems come back worded for the admin.
 */
export function parseTestDealInput(input: unknown): { fields?: TestDealFields; errors: string[] } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: string[] = [];
  const isFlash = o.isFlash === true;

  const name = text(o.name, 200);
  if (!name) errors.push("Give the deal a name.");
  const businessName = text(o.businessName, 120);
  if (!businessName) errors.push("Add a business name to show on the deal.");

  const category = text(o.category, 100);
  if (!CATEGORIES.some((c) => c.name === category)) errors.push("Pick a category.");

  const priceNow = money(o.priceNow);
  const priceWas = money(o.priceWas);
  if (!(priceNow > 0)) errors.push("Enter the deal price.");
  if (!(priceWas > 0)) errors.push("Enter the usual price.");
  else if (priceNow > 0 && priceWas <= priceNow) errors.push("The usual price must be more than the deal price.");
  if (priceWas > 100_000) errors.push("The usual price looks too high.");

  const duration = Number(o.duration);
  let durationMinutes = 0;
  if (!Number.isInteger(duration) || duration < 1) errors.push("Choose how long the deal runs.");
  else if (isFlash) {
    if (duration > FLASH_MAX_MINUTES) errors.push("A Flash deal can run for up to 6 hours.");
    else durationMinutes = duration;
  } else if (duration > EVERYDAY_MAX_DAYS) errors.push("An Everyday deal can run for up to 30 days.");
  else durationMinutes = duration * 24 * 60;

  const photo = text(o.photo, 200);
  if (!TEST_DEAL_PHOTOS.some((p) => p.src === photo)) errors.push("Pick a photo.");

  const bookingRequirement = isBookingChoice(o.bookingRequirement) ? o.bookingRequirement : "";
  if (!bookingRequirement) errors.push("Say whether customers need to book.");

  const dealCode = normaliseDealCode(o.dealCode);
  if (dealCode) {
    const codeProblem = dealCodeError(dealCode);
    if (codeProblem) errors.push(codeProblem);
  }

  if (errors.length) return { errors };
  return {
    errors,
    fields: {
      isFlash,
      durationMinutes,
      name,
      description: text(o.description, 2000),
      terms: text(o.terms, 2000),
      category,
      priceNow,
      priceWas,
      photo,
      businessName,
      suburb: text(o.suburb, 80),
      bookingRequirement,
      dealCode,
    },
  };
}

/** Reads a stored test deal back, dropping anything malformed. */
export function readStoredTestDeals(raw: unknown): TestDeal[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (t): t is TestDeal =>
      !!t &&
      typeof t === "object" &&
      typeof (t as TestDeal).id === "string" &&
      typeof (t as TestDeal).startedAt === "string" &&
      typeof (t as TestDeal).durationMinutes === "number"
  );
}

export function testDealEndsAt(t: Pick<TestDeal, "startedAt" | "durationMinutes">): number {
  return Date.parse(t.startedAt) + t.durationMinutes * 60_000;
}

export function testDealRunning(t: Pick<TestDeal, "startedAt" | "durationMinutes">, now: number = Date.now()): boolean {
  return testDealEndsAt(t) > now;
}

/** What the form shows for the run length: minutes (Flash) or days. */
export function testDealDurationValue(t: Pick<TestDeal, "isFlash" | "durationMinutes">): number {
  return t.isFlash ? t.durationMinutes : Math.round(t.durationMinutes / (24 * 60));
}

export function isTestDealSlug(slug: string): boolean {
  return slug.startsWith(TEST_DEAL_PREFIX);
}

const nzd = (n: number) =>
  new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

/**
 * The test deal as the customer pages render it. Business details beyond
 * the name and suburb are deliberately blank: a test deal belongs to no
 * real business, so it has no phone, website or booking link to send
 * anyone to.
 */
export function testDealToDeal(t: TestDeal): Deal {
  return {
    id: t.id,
    slug: `${TEST_DEAL_PREFIX}${t.id}`,
    isTest: true,
    name: t.name,
    description: t.description,
    image: t.photo,
    now: t.priceNow,
    was: t.priceWas,
    formattedNow: nzd(t.priceNow),
    formattedWas: nzd(t.priceWas),
    discountPercent: t.priceWas > t.priceNow ? Math.round(((t.priceWas - t.priceNow) / t.priceWas) * 100) : 0,
    currency: "NZD",
    ribbon: null,
    categories: [t.category],
    variantId: null,
    inStock: true,
    quantityAvailable: null,
    expiresAt: new Date(testDealEndsAt(t)).toISOString(),
    status: "Live",
    isFlash: t.isFlash,
    terms: t.terms || null,
    businessName: t.businessName,
    businessLogoUrl: null,
    businessWebsite: null,
    businessPhone: null,
    businessAddress: null,
    businessCity: "Auckland",
    businessSuburb: t.suburb || null,
    businessSlug: null,
    businessBio: null,
    businessHours: null,
    businessFacebookUrl: null,
    businessInstagramUrl: null,
    businessPriceRange: null,
    businessAmenities: [],
    businessBookingUrl: null,
    businessBookingEmail: null,
    businessLat: null,
    businessLng: null,
    businessRating: null,
    businessReviewCount: null,
    dealCode: t.dealCode || "MEGA-TEST1",
    bookingRequirement: parseBookingRequirement(t.bookingRequirement),
    codeOnWebsite: false,
    codeWebsiteUrl: null,
  };
}

/**
 * The draft "Copy to real draft" creates. Only the content carries over:
 * no photo (the test photos are site illustrations, not the business's
 * own), no code (the draft gets a fresh MEGA code when it's saved) and no
 * dates (a draft has none until it goes live). The business can change
 * everything before submitting it.
 */
export function testDealToDraft(t: TestDeal): DealDraftData {
  const { selectedIds, custom } = parseTerms(t.terms);
  return {
    ...EMPTY_DRAFT,
    dealName: t.name,
    category: t.category,
    description: t.description,
    terms: t.terms,
    selectedTerms: selectedIds,
    customTerms: custom,
    priceNow: String(t.priceNow),
    priceWas: String(t.priceWas),
    isFlash: t.isFlash,
    durationMinutes: t.isFlash ? t.durationMinutes : EMPTY_DRAFT.durationMinutes,
    durationDays: t.isFlash ? EMPTY_DRAFT.durationDays : testDealDurationValue(t),
    bookingRequirement: t.bookingRequirement,
  };
}
