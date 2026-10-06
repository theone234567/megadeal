import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { categorySlug, hashToken, mapActivity, mapDeal, mapEmailSignup, mapMerchant, normaliseUrl, type Issue } from "./wixToPostgres";
import { CATEGORIES } from "../categories";

// Wix-shaped records, the way the export script saves them: what the
// site writes today (app/api/merchants/apply, deals/create, …), including
// the untidy values real data has.
const WIX_MERCHANT = {
  _id: "wix-m-1",
  _owner: "wix-member-1",
  _createdDate: "2026-09-20T01:00:00.000Z",
  businessName: "Harbour Bistro",
  legalBusinessName: "Harbour Bistro Limited",
  nzbn: "9429 0000 0000 1",
  contactName: "Sam",
  contactPhone: "021 123 4567",
  email: "  Owner@HarbourBistro.co.nz ",
  emailVerified: true,
  phone: "09 123 4567",
  website: "harbourbistro.co.nz",
  bookingUrl: "javascript:alert(1)",
  bookingEmail: "book@harbourbistro.co.nz",
  facebookUrl: "facebook.com/harbourbistro",
  instagramUrl: "",
  address: "1 Quay St",
  suburb: "Auckland CBD",
  city: "Auckland",
  postcode: "1010",
  lat: -36.84,
  lng: 174.77,
  category: "Food & Drink",
  bio: "Seafood by the water.",
  businessHours: "Mon–Sun 11am–10pm",
  priceRange: "$$",
  amenities: "Outdoor seating, Wheelchair access ,",
  photos: '["https://static.wixstatic.com/media/a.jpg","https://static.wixstatic.com/media/b.jpg"]',
  logoUrl: "",
  rating: 4.6,
  reviewCount: 120,
  creditsBalance: 22,
  couponCode: "WELCOME6",
  referralCode: "MDAB12CD",
  referredByCode: "mdzz99yy",
  referralRewarded: false,
  status: "Approved",
  firstApprovedAt: "2026-09-21T02:00:00.000Z",
};

const WIX_PRODUCT = {
  id: "wix-p-1",
  slug: "two-course-dinner-harbour-bistro",
  name: "Two-course dinner",
  media: { main: { image: { url: "https://static.wixstatic.com/media/deal.jpg" } } },
  variantsInfo: { variants: [{ price: { actualPrice: { amount: "49" }, compareAtPrice: { amount: "80" } } }] },
  allCategoriesInfo: { categories: [{ id: CATEGORIES.find((c) => c.slug === "food-drink")!.id }] },
  ribbon: { name: "Popular" },
};

const WIX_DEAL = {
  _id: "wix-d-1",
  _createdDate: "2026-09-22T01:00:00.000Z",
  productId: "wix-p-1",
  merchantEmail: "OWNER@harbourbistro.co.nz",
  dealName: "Two-course dinner",
  description: "Any main and dessert.",
  terms: "Dine-in only.",
  priceNow: 49,
  priceWas: 80,
  quantityAvailable: 50,
  isFlash: false,
  status: "Live",
  bookingRequirement: "recommended",
  dealCode: "MEGA-7K4XQ",
  codeOnWebsite: false,
  creditsCharged: 4,
  requestedDurationMinutes: 43200,
  firstApprovedAt: "2026-09-23T00:00:00.000Z",
  firstPublishedAt: "2026-09-23T00:00:00.000Z",
  expiresAt: "2026-10-23T00:00:00.000Z",
  everLive: true,
  pendingRevision: '{"terms":"Dine-in only. Not on public holidays."}',
  aiReview: { verdict: "ok" },
  contentHistory: [{ at: "2026-09-23T00:00:00.000Z", fields: ["terms"] }],
  viewCount: 314,
  clickCount: 40,
  codeCopyCount: 12,
};

describe("small conversions", () => {
  it("normalises links the way the site renders them", () => {
    const issues: Issue[] = [];
    expect(normaliseUrl("harbourbistro.co.nz", issues, "r", "website")).toBe("https://harbourbistro.co.nz");
    expect(normaliseUrl("http://old.example.nz", issues, "r", "website")).toBe("http://old.example.nz");
    expect(normaliseUrl("", issues, "r", "website")).toBeNull();
    expect(issues).toEqual([]);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.nz", "https://exa mple.com"]) {
      expect(normaliseUrl(bad, issues, "r", "website")).toBeNull();
    }
    expect(issues).toHaveLength(4);
  });

  it("finds categories by name, slug or Wix id", () => {
    for (const c of CATEGORIES) {
      expect(categorySlug(c.name)).toBe(c.slug);
      expect(categorySlug(c.name.toUpperCase())).toBe(c.slug);
      expect(categorySlug(c.slug)).toBe(c.slug);
      if (c.id) expect(categorySlug(c.id)).toBe(c.slug);
    }
    expect(categorySlug("Gambling")).toBeNull();
  });
});

describe("mapMerchant", () => {
  it("keeps every field, tidied, and reports what it couldn't keep", () => {
    const issues: Issue[] = [];
    const row = mapMerchant(WIX_MERCHANT, issues);
    expect(row).toMatchObject({
      wix_id: "wix-m-1",
      email: "owner@harbourbistro.co.nz",
      nzbn: "9429000000001",
      website: "https://harbourbistro.co.nz",
      booking_url: null,
      facebook_url: "https://facebook.com/harbourbistro",
      category_slug: "food-drink",
      amenities: ["Outdoor seating", "Wheelchair access"],
      photos: ["https://static.wixstatic.com/media/a.jpg", "https://static.wixstatic.com/media/b.jpg"],
      credits_balance: 22,
      referred_by_code: "MDZZ99YY",
      status: "Approved",
    });
    expect(issues).toEqual([expect.objectContaining({ field: "bookingUrl", value: "javascript:alert(1)" })]);
  });

  it("corrects impossible values and says so", () => {
    const issues: Issue[] = [];
    const row = mapMerchant({ ...WIX_MERCHANT, status: "Rejected", creditsBalance: -3, category: "Gambling", nzbn: "123" }, issues);
    expect(row).toMatchObject({ status: "Pending", credits_balance: 0, category_slug: null, nzbn: null });
    expect(issues.map((i) => i.field).sort()).toEqual(["bookingUrl", "category", "creditsBalance", "nzbn", "status"]);
  });
});

describe("mapDeal", () => {
  const ids = new Map([["owner@harbourbistro.co.nz", "00000000-0000-0000-0000-000000000001"]]);

  it("joins the Deals row and its Stores product into one record", () => {
    const issues: Issue[] = [];
    const row = mapDeal(WIX_DEAL, WIX_PRODUCT, ids, issues)!;
    expect(row).toMatchObject({
      wix_id: "wix-d-1",
      wix_product_id: "wix-p-1",
      merchant_id: "00000000-0000-0000-0000-000000000001",
      slug: "two-course-dinner-harbour-bistro",
      name: "Two-course dinner",
      category_slug: "food-drink",
      photo_url: "https://static.wixstatic.com/media/deal.jpg",
      price_now: 49,
      price_was: 80,
      ribbon: "Popular",
      status: "Live",
      paused_by: null,
      pending_revision: { terms: "Dine-in only. Not on public holidays." },
      ai_review: { verdict: "ok" },
      view_count: 314,
      code_copy_count: 12,
      website_click_count: 0,
    });
    expect(issues).toEqual([]);
  });

  it("imports a draft with no product", () => {
    const issues: Issue[] = [];
    const row = mapDeal(
      { _id: "wix-d-2", merchantEmail: "owner@harbourbistro.co.nz", status: "Draft", dealName: "Half-written", draftData: '{"dealName":"Half-written"}' },
      null,
      ids,
      issues
    )!;
    expect(row).toMatchObject({ status: "Draft", slug: null, draft_data: { dealName: "Half-written" } });
    expect(issues).toEqual([]);
  });

  it("marks a paused deal as paused by the business, and reports orphans", () => {
    const issues: Issue[] = [];
    expect(mapDeal({ ...WIX_DEAL, status: "Paused" }, WIX_PRODUCT, ids, issues)).toMatchObject({ status: "Paused", paused_by: "business" });
    expect(mapDeal({ ...WIX_DEAL, merchantEmail: "nobody@example.nz" }, WIX_PRODUCT, ids, issues)).toBeNull();
    expect(issues).toEqual([expect.objectContaining({ field: "merchantEmail", value: "nobody@example.nz" })]);
  });

  it("keeps the name and price customers see (the product's), and lists any disagreement", () => {
    const issues: Issue[] = [];
    const row = mapDeal({ ...WIX_DEAL, dealName: "Old name", priceNow: 45 }, WIX_PRODUCT, ids, issues)!;
    expect(row).toMatchObject({ name: "Two-course dinner", price_now: 49 });
    expect(issues.map((i) => i.field).sort()).toEqual(["dealName", "priceNow"]);
  });

  it("takes the price from the product when the row has none", () => {
    const row = mapDeal({ ...WIX_DEAL, priceNow: undefined, priceWas: undefined }, WIX_PRODUCT, ids, [])!;
    expect(row).toMatchObject({ price_now: 49, price_was: 80 });
  });
});

describe("mapEmailSignup and mapActivity", () => {
  it("hashes email tokens rather than copying them", () => {
    const row = mapEmailSignup(
      { _id: "s1", email: "Fan@Example.co.nz", audience: "customer", verified: true, verifyToken: "abc", unsubscribeToken: "def" },
      []
    )!;
    expect(row).toMatchObject({ email: "fan@example.co.nz", verify_token_hash: hashToken("abc"), unsubscribe_token_hash: hashToken("def") });
    expect(JSON.stringify(row)).not.toMatch(/"abc"|"def"/);
  });

  it("skips what can't be imported, with a reason", () => {
    const issues: Issue[] = [];
    expect(mapEmailSignup({ email: "not-an-email" }, issues)).toBeNull();
    expect(mapActivity({ merchantEmail: "nobody@example.nz", type: "credit", description: "x" }, new Map(), issues)).toBeNull();
    expect(issues).toHaveLength(2);
  });
});

describe("converted records fit the new database", () => {
  let db: PGlite;
  let insert: Awaited<ReturnType<typeof createTestDb>>["insert"];
  let as: Awaited<ReturnType<typeof createTestDb>>["as"];

  beforeAll(async () => {
    ({ db, insert, as } = await createTestDb());
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });

  it("inserts a business, its live, paused and draft deals, activity and sign-ups", async () => {
    const issues: Issue[] = [];
    const merchantId = await insert("merchants", mapMerchant(WIX_MERCHANT, issues));
    const ids = new Map([["owner@harbourbistro.co.nz", merchantId]]);

    await insert("deals", mapDeal(WIX_DEAL, WIX_PRODUCT, ids, issues)!);
    await insert("deals", mapDeal({ ...WIX_DEAL, _id: "wix-d-3", productId: "wix-p-3", status: "Paused" }, { ...WIX_PRODUCT, id: "wix-p-3", slug: "paused-deal" }, ids, issues)!);
    await insert("deals", mapDeal({ _id: "wix-d-2", merchantEmail: "owner@harbourbistro.co.nz", status: "Draft", draftData: "{}" }, null, ids, issues)!);
    await as(
      { role: "service_role" },
      "insert into public.merchant_activity (merchant_id, type, amount, description) select $1, $2, $3, $4",
      Object.values(mapActivity({ merchantEmail: "owner@harbourbistro.co.nz", type: "credit", amount: 24, description: "Welcome credits" }, ids, issues)!).slice(0, 4)
    );
    await insert("email_signups", mapEmailSignup({ _id: "s1", email: "fan@example.co.nz", audience: "customer", verifyToken: "abc" }, issues)!);

    const live = await as<{ slug: string }>({ role: "anon" }, "select slug from public.public_deals");
    expect(live.map((r) => r.slug)).toEqual(["two-course-dinner-harbour-bistro"]);
    const [counts] = await as<{ deals: number }>({ role: "service_role" }, "select count(*)::int as deals from public.deals");
    expect(counts.deals).toBe(3);
  });
});
