import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { mapDeal, mapMerchant } from "./wixToPostgres";
import { listBusinessesForSitemap, listLiveDealsForSitemap, loadLiveDeals, readBusinessBySlug, readDealBySlug, readDealForAdmin, resolveBusinessRedirect } from "./publicReads";
import { CATEGORIES } from "../categories";
import type { Sql } from "./connection";
import type { Deal } from "../types";

/**
 * The storefront must look the same whichever database it reads. Each
 * test here builds the same business and deals two ways: as Wix holds
 * them, read through today's code (lib/fetchDealServer.ts, with Wix
 * replaced by these fixtures), and converted (wixToPostgres) into the new
 * database, read through publicReads. The deals that come out must match
 * field for field, apart from the few that are Wix's own bookkeeping.
 */

const NOW = new Date("2026-10-07T00:00:00Z").getTime();
const FOOD = CATEGORIES.find((c) => c.slug === "food-drink")!;

const merchant = {
  _id: "3f2a9c1e-1111-4222-8333-944455556666",
  _createdDate: "2026-09-20T01:00:00.000Z",
  _updatedDate: "2026-09-25T01:00:00.000Z",
  email: "owner@harbourbistro.co.nz",
  businessName: "Harbour Bistro",
  status: "Approved",
  phone: "09 123 4567",
  website: "https://harbourbistro.co.nz",
  bookingUrl: "https://harbourbistro.co.nz/book",
  bookingEmail: "book@harbourbistro.co.nz",
  facebookUrl: "https://facebook.com/harbourbistro",
  address: "1 Quay Street, Auckland CBD, Auckland 1010",
  city: "Auckland",
  bio: "Seafood by the water.",
  businessHours: "Mon–Sun 11am–10pm",
  priceRange: "$$",
  amenities: "Outdoor seating, Wheelchair access",
  photos: '["https://static.wixstatic.com/media/a.jpg","https://static.wixstatic.com/media/b.jpg"]',
  logoUrl: "https://static.wixstatic.com/media/logo.png",
  lat: -36.84,
  lng: 174.77,
  rating: 4.6,
  reviewCount: 120,
  creditsBalance: 10,
};

function product(id: string, slug: string, now: string, was: string) {
  return {
    id,
    slug,
    name: `Deal ${slug}`,
    variantsInfo: { variants: [{ price: { actualPrice: { amount: now }, compareAtPrice: { amount: was } } }] },
    media: { main: { image: { url: `https://static.wixstatic.com/media/${slug}.jpg` } } },
    allCategoriesInfo: { categories: [{ id: FOOD.id }] },
    ribbon: { name: "Popular" },
  };
}

function dealRow(id: string, productId: string, extra: Record<string, unknown> = {}) {
  return {
    _id: id,
    _createdDate: "2026-09-22T01:00:00.000Z",
    productId,
    merchantEmail: merchant.email,
    dealName: `Deal for ${productId}`,
    description: "Any main and dessert.",
    terms: "Dine-in only.",
    priceNow: 49,
    priceWas: 80,
    quantityAvailable: 50,
    status: "Live",
    bookingRequirement: "recommended",
    dealCode: "MEGA-7K4XQ",
    codeOnWebsite: false,
    firstPublishedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-10-30T00:00:00.000Z",
    everLive: true,
    ...extra,
  };
}

// A live deal, a flash one, one that has ended, one scheduled for later
// and one paused: what the storefront has to tell apart.
const products = [
  product("p-live", "two-course-dinner", "49", "80"),
  product("p-flash", "flash-oysters", "20", "40"),
  product("p-ended", "ended-brunch", "25", "50"),
  product("p-later", "later-lunch", "30", "45"),
  product("p-paused", "paused-tasting", "60", "120"),
];
const dealRows = [
  dealRow("d-live", "p-live", { priceNow: 49, priceWas: 80 }),
  dealRow("d-flash", "p-flash", { priceNow: 20, priceWas: 40, isFlash: true, quantityAvailable: 0, expiresAt: "2026-10-07T04:00:00.000Z" }),
  dealRow("d-ended", "p-ended", { priceNow: 25, priceWas: 50, expiresAt: "2026-10-05T00:00:00.000Z" }),
  dealRow("d-later", "p-later", { priceNow: 30, priceWas: 45, firstPublishedAt: "2026-10-09T00:00:00.000Z", everLive: false }),
  dealRow("d-paused", "p-paused", { priceNow: 60, priceWas: 120, status: "Paused" }),
];

// Today's Wix reads, with Wix replaced by the fixtures above.
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("../wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: {
      query: (collection: string) => {
        const rows = collection === "Deals" ? dealRows : [merchant];
        const find = async () => ({ items: rows });
        return {
          isNotEmpty: () => ({ limit: () => ({ find }) }),
          eq: (field: string, value: unknown) => ({
            find: async () => ({ items: rows.filter((r: Record<string, unknown>) => r[field] === value) }),
          }),
        };
      },
    },
    productsV3: {
      getProductBySlug: async (slug: string) => ({ product: products.find((p) => p.slug === slug) }),
    },
  }),
}));
vi.mock("../searchAllProducts", () => ({ searchAllProducts: async () => products }));
vi.mock("../queryAll", () => ({ queryAllItems: async () => [merchant] }));

async function wixReads() {
  vi.resetModules();
  return import("../fetchDealServer");
}

// Wix's own bookkeeping, which the new database doesn't have: the deal's
// id is the Stores product's (the new one is the deal's own), and Wix
// sends ready-formatted prices and a variant id. The business address is
// different on purpose (readable, no Wix id), and redirected: checked in
// its own test below.
function comparable(deal: Deal) {
  const { id: _id, formattedNow: _fn, formattedWas: _fw, variantId: _v, businessSlug: _b, ...rest } = deal;
  return rest;
}

describe("the new database shows the storefront exactly what Wix does", () => {
  let pglite: PGlite;
  let db: Sql;
  let merchantId: string;

  beforeAll(async () => {
    const t = await createTestDb();
    pglite = t.db;
    db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
    merchantId = await t.insert("merchants", mapMerchant(merchant, []));
    const ids = new Map([[merchant.email, merchantId]]);
    for (const row of dealRows) {
      await t.insert("deals", mapDeal(row, products.find((p) => p.id === row.productId)!, ids, [])!);
    }
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  }, 60_000);
  afterAll(async () => {
    vi.useRealTimers();
    await pglite?.close();
  });

  it("lists the same live deals, the same way", async () => {
    const wix = await (await wixReads()).fetchAllLiveDealsServer();
    const pg = (await loadLiveDeals(db, NOW)).map((await import("../listingDeal")).toListingDeal);
    expect(wix.map((d) => d.slug).sort()).toEqual(["flash-oysters", "two-course-dinner"]);
    expect(pg.map((d) => d.slug).sort()).toEqual(wix.map((d) => d.slug).sort());
    for (const w of wix) {
      const p = pg.find((d) => d.slug === w.slug)!;
      expect(comparable({ ...p, inStock: w.inStock })).toEqual(comparable(w));
    }
  });

  it("opens the same deal page, with contact details and code", async () => {
    const wix = await (await wixReads()).fetchDealForSEO("two-course-dinner");
    const pg = await readDealBySlug(db, "two-course-dinner", NOW);
    expect(pg?.live).toBe(true);
    expect(comparable(pg!.deal)).toEqual(comparable(wix!));
    expect(pg!.deal.dealCode).toBe("MEGA-7K4XQ");
    expect(pg!.deal.businessPhone).toBe("09 123 4567");
  });

  it("shows an ended deal as ended, and hides one not yet started or paused", async () => {
    const reads = await wixReads();
    for (const slug of ["ended-brunch", "later-lunch", "paused-tasting"]) {
      const wixLive = await reads.fetchDealForSEO(slug);
      const wixEnded = await reads.fetchEndedDeal(slug);
      const pg = await readDealBySlug(db, slug, NOW);
      expect({ slug, live: Boolean(pg?.live), ended: Boolean(pg && !pg.live && pg.wasPublished) }).toEqual({
        slug,
        live: Boolean(wixLive),
        ended: Boolean(wixEnded),
      });
    }
    expect(await readDealBySlug(db, "no-such-deal", NOW)).toBeNull();
  });

  it("the same business page, at a readable address the old one redirects to", async () => {
    const wix = await (await wixReads()).fetchBusinessProfileBySlug("harbour-bistro-3f2a9c1e");
    // The fixture has no suburb saved, so it's the name alone.
    const pg = await readBusinessBySlug(db, "harbour-bistro");
    const { id: _w, slug: _ws, ...wixBusiness } = wix!.business;
    const { id: _p, slug: _ps, ...pgBusiness } = pg!;
    expect(pgBusiness).toEqual(wixBusiness);
    expect(await resolveBusinessRedirect(db, "harbour-bistro-3f2a9c1e")).toBe("harbour-bistro");
    // Any name in front of the old id finds it too, as Wix's did.
    expect(await resolveBusinessRedirect(db, "old-name-3f2a9c1e")).toBe("harbour-bistro");
    expect(await resolveBusinessRedirect(db, "harbour-bistro")).toBeNull();
    // Every deal card links to the new address.
    expect((await loadLiveDeals(db, NOW)).every((d) => d.businessSlug === "harbour-bistro")).toBe(true);
  });

  it("gives the sitemap the same pages", async () => {
    const reads = await wixReads();
    const pgBusinesses = (await listBusinessesForSitemap(db)).map((b) => b.slug);
    const wixBusinesses = (await reads.fetchAllBusinessSlugsForSitemap()).map((b) => b.slug);
    expect(await Promise.all(wixBusinesses.map((s) => resolveBusinessRedirect(db, s)))).toEqual(pgBusinesses);
    const pgDeals = await listLiveDealsForSitemap(db, NOW);
    const wixDeals = await reads.fetchAllLiveDealSlugsForSitemap();
    expect(pgDeals.map(({ slug, categories, merchantEmail }) => ({ slug, categories, merchantEmail })).sort((a, b) => a.slug.localeCompare(b.slug))).toEqual(
      wixDeals.map(({ slug, categories, merchantEmail }) => ({ slug, categories, merchantEmail })).sort((a, b) => a.slug.localeCompare(b.slug))
    );
  });
});

describe("what the public never gets", () => {
  let pglite: PGlite;
  let db: Sql;
  let t: Awaited<ReturnType<typeof createTestDb>>;

  beforeAll(async () => {
    t = await createTestDb();
    pglite = t.db;
    db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  }, 60_000);
  afterAll(async () => {
    await pglite?.close();
  });

  it("no deals from a business that isn't approved, and no test deals", async () => {
    const pendingId = await t.insert("merchants", mapMerchant({ ...merchant, _id: "aaaaaaaa-0000-4000-8000-000000000001", email: "p@x.nz", status: "Pending" }, []));
    const approvedId = await t.insert("merchants", mapMerchant({ ...merchant, _id: "bbbbbbbb-0000-4000-8000-000000000002", email: "a@x.nz" }, []));
    const ids = new Map([["p@x.nz", pendingId], ["a@x.nz", approvedId]]);
    await t.insert("deals", mapDeal({ ...dealRow("x1", "p1"), merchantEmail: "p@x.nz" }, product("p1", "pending-business-deal", "10", "20"), ids, [])!);
    await t.insert("deals", mapDeal({ ...dealRow("x2", "p2"), merchantEmail: "a@x.nz", isTest: true }, product("p2", "test-deal", "10", "20"), ids, [])!);
    await t.insert("deals", mapDeal({ ...dealRow("x3", "p3"), merchantEmail: "a@x.nz" }, product("p3", "real-deal", "10", "20"), ids, [])!);

    expect((await loadLiveDeals(db, NOW)).map((d) => d.slug)).toEqual(["real-deal"]);
    expect(await readDealBySlug(db, "pending-business-deal", NOW)).toBeNull();
    expect(await readDealBySlug(db, "test-deal", NOW)).toBeNull();
    // A pending business has no page, and an old address doesn't reveal it.
    expect(await resolveBusinessRedirect(db, "harbour-bistro-aaaaaaaa")).toBeNull();
    const [{ slug: pendingSlug }] = await db.query<{ slug: string }>("select slug from public.merchants where email = 'p@x.nz'");
    expect(await readBusinessBySlug(db, pendingSlug)).toBeNull();
    // Two businesses with one name: the approved one gets the plain
    // address, not the application that was there first.
    expect((await listBusinessesForSitemap(db)).map((b) => b.slug)).toEqual(["harbour-bistro"]);
  });

  it("a new business's address is its name and suburb, macrons and all", async () => {
    await db.query("insert into public.merchants (email, business_name, suburb, status) values ('new@x.nz', 'Kai Café & Bar', 'Ōtāhuhu', 'Approved')");
    expect((await readBusinessBySlug(db, "kai-cafe-bar-otahuhu"))?.businessName).toBe("Kai Café & Bar");
    expect(await readBusinessBySlug(db, "not a slug")).toBeNull();
  });

  it("the admin preview opens any status but not a draft", async () => {
    const [{ id: merchantId }] = await db.query<{ id: string }>("select id from public.merchants where email = 'a@x.nz'");
    const [paused] = await db.query<{ id: string }>(
      `insert into public.deals (merchant_id, slug, name, price_now, category_slug, status, paused_by, ai_review)
       values ($1, 'paused-one', 'Paused one', 10, 'food-drink', 'Paused', 'admin', '{"verdict":"ok"}') returning id`,
      [merchantId]
    );
    const [draft] = await db.query<{ id: string }>(
      "insert into public.deals (merchant_id, status) values ($1, 'Draft') returning id",
      [merchantId]
    );
    expect(await readDealForAdmin(db, paused.id)).toMatchObject({ deal: { slug: "paused-one" }, record: { status: "Paused", aiReview: { verdict: "ok" } } });
    expect(await readDealForAdmin(db, draft.id)).toBeNull();
    expect(await readDealForAdmin(db, "' or 1=1 --")).toBeNull();
  });
});
