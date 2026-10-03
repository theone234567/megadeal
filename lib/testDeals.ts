import { parseBookingRequirement } from "./booking";
import { EMPTY_DRAFT, type DealDraftData } from "./dealDraft";
import { checkDealFields } from "./dealSubmission";
import { parseTerms } from "./dealTerms";
import { EVERYDAY_MAX_DAYS, FLASH_MAX_MINUTES } from "./dealDuration";
import type { Deal } from "./types";

/**
 * Admin test deals (handoff pack, FINAL-SPEC §8): Everyday and Flash deals
 * only an admin can see, on the private homepage, category, Flash and deal
 * previews, with a timer that can be restarted. Pure rules only; stored by
 * lib/testDealStore.ts.
 *
 * Made with the same "Create a deal" form a business uses (NewDealForm in
 * test mode) and checked by the same rules (lib/dealSubmission.ts), plus
 * the two things a business's profile would otherwise supply: the
 * business name and suburb to show.
 *
 * Kept entirely apart from real deals: never in Wix (no product, no Deals
 * row), so nothing public can list them, and they have no credits, stock
 * or analytics. They ignore the Everyday/Flash switches and shorter
 * maximum runs in Platform settings, so anything a business could be
 * allowed can be tried. "Copy to real draft" is the only way one becomes
 * real: an ordinary draft for a business you pick, with a new id and
 * code, that still has to be submitted and approved like any other.
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

/** The same fields a business submits (app/api/deals/create), plus the
 *  business name and suburb. */
export interface TestDealFields {
  businessName: string;
  suburb: string;
  dealName: string;
  category: string;
  description: string;
  terms: string;
  priceNow: number;
  /** Null when no original price was given. */
  priceWas: number | null;
  isFlash: boolean;
  /** The run: minutes for Flash, whole days (stored as minutes) for Everyday. */
  durationMinutes: number;
  quantityAvailable: number | null;
  bookingRequirement: string;
  /** The business's own code, or "" (the example MEGA code is shown). */
  dealCode: string;
  codeOnWebsite: boolean;
  codeWebsiteUrl: string;
  codeTested: boolean;
  photo: string;
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

/**
 * Checks a test deal from untrusted input (the form in test mode): the
 * business's own rules (lib/dealSubmission.ts) with the product maximums
 * and the site's sample photos, plus a business name.
 */
export function parseTestDealInput(input: unknown): { fields?: TestDealFields; error?: string } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const businessName = text(o.businessName, 120);
  if (!businessName) return { error: "Add a business name to show on the deal." };

  const checked = checkDealFields(o, {
    typeBlocked: () => null,
    maxDuration: (flash) => (flash ? FLASH_MAX_MINUTES : EVERYDAY_MAX_DAYS),
    photoError: (url) => (TEST_DEAL_PHOTOS.some((p) => p.src === url) ? null : "Pick one of the sample photos."),
  });
  if (!checked.ok) return { error: checked.error };
  const f = checked.fields;
  return {
    fields: {
      businessName,
      suburb: text(o.suburb, 80),
      dealName: f.dealName,
      category: f.category,
      description: f.description,
      terms: f.terms,
      priceNow: f.priceNow,
      priceWas: f.priceWas ?? null,
      isFlash: f.isFlash,
      durationMinutes: f.isFlash ? f.durationMinutes : f.durationDays * 24 * 60,
      quantityAvailable: f.quantityAvailable ?? null,
      bookingRequirement: f.bookingRequirement,
      dealCode: f.customDealCode,
      codeOnWebsite: f.codeOnWebsite,
      codeWebsiteUrl: f.codeOnWebsite ? f.codeWebsiteUrl : "",
      codeTested: f.codeOnWebsite && o.codeTested === true,
      photo: f.photoUrl,
    },
  };
}

/**
 * Reads stored test deals back, dropping anything malformed. Test deals
 * saved by the first version (a shorter form: `name`, a required usual
 * price, no quantity or website code) are carried over.
 */
export function readStoredTestDeals(raw: unknown): TestDeal[] {
  if (!Array.isArray(raw)) return [];
  const out: TestDeal[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const r = t as Record<string, any>;
    if (typeof r.id !== "string" || typeof r.startedAt !== "string" || typeof r.durationMinutes !== "number") continue;
    const dealName = typeof r.dealName === "string" ? r.dealName : typeof r.name === "string" ? r.name : "";
    if (!dealName) continue;
    out.push({
      id: r.id,
      createdAt: String(r.createdAt ?? r.startedAt),
      updatedAt: String(r.updatedAt ?? r.startedAt),
      startedAt: r.startedAt,
      businessName: String(r.businessName ?? ""),
      suburb: String(r.suburb ?? ""),
      dealName,
      category: String(r.category ?? ""),
      description: String(r.description ?? ""),
      terms: String(r.terms ?? ""),
      priceNow: Number(r.priceNow) || 0,
      priceWas: typeof r.priceWas === "number" ? r.priceWas : null,
      isFlash: r.isFlash === true,
      durationMinutes: r.durationMinutes,
      quantityAvailable: typeof r.quantityAvailable === "number" ? r.quantityAvailable : null,
      bookingRequirement: String(r.bookingRequirement ?? ""),
      dealCode: String(r.dealCode ?? ""),
      codeOnWebsite: r.codeOnWebsite === true,
      codeWebsiteUrl: String(r.codeWebsiteUrl ?? ""),
      codeTested: r.codeTested === true,
      photo: String(r.photo ?? ""),
    });
  }
  return out;
}

export function testDealEndsAt(t: Pick<TestDeal, "startedAt" | "durationMinutes">): number {
  return Date.parse(t.startedAt) + t.durationMinutes * 60_000;
}

export function testDealRunning(t: Pick<TestDeal, "startedAt" | "durationMinutes">, now: number = Date.now()): boolean {
  return testDealEndsAt(t) > now;
}

/** The run as the form picks it: minutes (Flash) or days (Everyday). */
export function testDealDurationValue(t: Pick<TestDeal, "isFlash" | "durationMinutes">): number {
  return t.isFlash ? t.durationMinutes : Math.round(t.durationMinutes / (24 * 60));
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
  const was = t.priceWas ?? t.priceNow;
  return {
    id: t.id,
    slug: `${TEST_DEAL_PREFIX}${t.id}`,
    isTest: true,
    name: t.dealName,
    description: t.description,
    image: t.photo || null,
    now: t.priceNow,
    was,
    formattedNow: nzd(t.priceNow),
    formattedWas: nzd(was),
    discountPercent: was > t.priceNow ? Math.round(((was - t.priceNow) / was) * 100) : 0,
    currency: "NZD",
    ribbon: null,
    categories: t.category ? [t.category] : [],
    variantId: null,
    inStock: true,
    quantityAvailable: t.quantityAvailable,
    expiresAt: new Date(testDealEndsAt(t)).toISOString(),
    status: "Live",
    isFlash: t.isFlash,
    terms: t.terms || null,
    businessName: t.businessName || null,
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
    codeOnWebsite: t.codeOnWebsite,
    codeWebsiteUrl: t.codeWebsiteUrl || null,
  };
}

/**
 * The draft "Copy to real draft" creates. The deal's content carries over;
 * the photo doesn't (the test photos are site illustrations, not the
 * business's own), nor does the code (the draft gets a fresh MEGA code
 * when it's saved, so the website-code answer goes too) or any dates (a
 * draft has none until it goes live). The business can change everything
 * before submitting it.
 */
export function testDealToDraft(t: TestDeal): DealDraftData {
  const { selectedIds, custom } = parseTerms(t.terms);
  return {
    ...EMPTY_DRAFT,
    dealName: t.dealName,
    category: t.category,
    description: t.description,
    terms: t.terms,
    selectedTerms: selectedIds,
    customTerms: custom,
    priceNow: String(t.priceNow),
    priceWas: t.priceWas === null ? "" : String(t.priceWas),
    isFlash: t.isFlash,
    durationMinutes: t.isFlash ? t.durationMinutes : EMPTY_DRAFT.durationMinutes,
    durationDays: t.isFlash ? EMPTY_DRAFT.durationDays : testDealDurationValue(t),
    quantityAvailable: t.quantityAvailable === null ? "" : String(t.quantityAvailable),
    bookingRequirement: t.bookingRequirement,
  };
}
