import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { listBusinessesForSitemap, listLiveDealsForSitemap, loadLiveDeals, readBusinessBySlug, readDealBySlug, readDealForAdmin, resolveBusinessRedirect } from "./publicReads";
import type { Sql } from "./connection";
import type { Deal } from "../types";
import golden from "./publicReads.fixtures.json";

/**
 * What the storefront shows from the database. The fixtures
 * (publicReads.fixtures.json) are a business and five deals as they were
 * brought over from Wix, and what the old Wix-reading code showed for
 * them, saved when that code was removed (Oct 2026): the pages must still
 * show the same, field for field, apart from the few fields that were
 * Wix's own bookkeeping.
 */

const NOW = new Date("2026-10-07T00:00:00Z").getTime();

type Row = Record<string, unknown>;
/** A fixture row with its business placeholder filled in. */
const withIds = (row: Row, ids: Record<string, string>): Row =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && v in ids ? ids[v] : v]));

// Wix's own bookkeeping, which the database doesn't have: the deal's id
// was the Stores product's (now the deal's own), and Wix sent
// ready-formatted prices and a variant id. The business address is
// different on purpose (readable, no Wix id), and redirected: checked in
// its own test below. Provenance (who listed it, when it was checked) is
// new since Wix: checked in its own test below.
function comparable(deal: Deal) {
  const {
    id: _id, formattedNow: _fn, formattedWas: _fw, variantId: _v, businessSlug: _b,
    updatedAt: _u, approvedAt: _a, merchantConfirmedAt: _m, source: _s, tags: _t, gallery: _g, businessClaimed: _c, businessApprovedAt: _ba,
    ...rest
  } = deal;
  return rest;
}

describe("the storefront shows what it did on Wix", () => {
  let pglite: PGlite;
  let db: Sql;
  let merchantId: string;

  beforeAll(async () => {
    const t = await createTestDb();
    pglite = t.db;
    db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
    merchantId = await t.insert("merchants", golden.merchantRow);
    for (const row of golden.dealRows) await t.insert("deals", withIds(row, { MERCHANT_ID: merchantId }));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  }, 60_000);
  afterAll(async () => {
    vi.useRealTimers();
    await pglite?.close();
  });

  it("lists the same live deals, the same way", async () => {
    const wix = golden.liveDeals as unknown as Deal[];
    const pg = (await loadLiveDeals(db, NOW)).map((await import("../listingDeal")).toListingDeal);
    expect(wix.map((d) => d.slug).sort()).toEqual(["flash-oysters", "two-course-dinner"]);
    expect(pg.map((d) => d.slug).sort()).toEqual(wix.map((d) => d.slug).sort());
    for (const w of wix) {
      const p = pg.find((d) => d.slug === w.slug)!;
      expect(comparable({ ...p, inStock: w.inStock })).toEqual(w);
    }
  });

  it("opens the same deal page, with contact details and code", async () => {
    const pg = await readDealBySlug(db, "two-course-dinner", NOW);
    expect(pg?.live).toBe(true);
    expect(comparable(pg!.deal)).toEqual(golden.dealPage);
    expect(pg!.deal.dealCode).toBe("MEGA-7K4XQ");
    expect(pg!.deal.businessPhone).toBe("09 123 4567");
  });

  it("shows an ended deal as ended, and hides one not yet started or paused", async () => {
    // What Wix showed: not live, and as ended once it had been on the site
    // (a paused deal too); one not yet started not at all.
    for (const [slug, ended] of [["ended-brunch", true], ["later-lunch", false], ["paused-tasting", true]] as const) {
      const pg = await readDealBySlug(db, slug, NOW);
      expect({ slug, live: Boolean(pg?.live), ended: Boolean(pg && !pg.live && pg.wasPublished) }).toEqual({ slug, live: false, ended });
    }
    expect(await readDealBySlug(db, "no-such-deal", NOW)).toBeNull();
  });

  it("the same business page, at a readable address the old one redirects to", async () => {
    // The fixture has no suburb saved, so it's the name alone.
    const pg = await readBusinessBySlug(db, "harbour-bistro");
    // claimed is new since Wix (shown as "Business verified").
    const { id: _p, slug: _ps, claimed: _cl, ...pgBusiness } = pg!;
    expect(pgBusiness).toEqual(golden.businessPage);
    // The fixture's owner hasn't linked a login.
    expect(pg!.claimed).toBe(false);
    expect(await resolveBusinessRedirect(db, "harbour-bistro-3f2a9c1e")).toBe("harbour-bistro");
    // Any name in front of the old id finds it too, as Wix's did.
    expect(await resolveBusinessRedirect(db, "old-name-3f2a9c1e")).toBe("harbour-bistro");
    expect(await resolveBusinessRedirect(db, "harbour-bistro")).toBeNull();
    // Every deal card links to the new address.
    expect((await loadLiveDeals(db, NOW)).every((d) => d.businessSlug === "harbour-bistro")).toBe(true);
  });

  it("gives the sitemap the same pages", async () => {
    expect((await listBusinessesForSitemap(db)).map((b) => b.slug)).toEqual(["harbour-bistro"]);
    const pgDeals = await listLiveDealsForSitemap(db, NOW);
    expect(pgDeals.map(({ slug, categories, merchantEmail }) => ({ slug, categories, merchantEmail })).sort((a, b) => a.slug.localeCompare(b.slug))).toEqual(golden.sitemapDeals);
  });

  it("dates each deal by when what customers see last changed, not by its views", async () => {
    const before = await listLiveDealsForSitemap(db, NOW);
    await db.query("update public.deals set view_count = view_count + 1, click_count = click_count + 1");
    const after = await listLiveDealsForSitemap(db, NOW);
    expect(after.map((d) => d.updatedAt)).toEqual(before.map((d) => d.updatedAt));
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
    const ids = {
      PENDING_ID: await t.insert("merchants", golden.pendingMerchantRow),
      APPROVED_ID: await t.insert("merchants", golden.approvedMerchantRow),
    };
    // A deal of the pending business, a test deal and a real one.
    for (const row of golden.otherDealRows) await t.insert("deals", withIds(row, ids));

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

  it("says who listed each deal and when it was last checked", async () => {
    await db.query("update public.deals set tags = '{date-night,not-a-tag}', merchant_confirmed_at = now() where slug = 'real-deal'");
    const deal = (await readDealBySlug(db, "real-deal", NOW))!.deal;
    expect(deal).toMatchObject({ source: "merchant", tags: ["date-night"], businessClaimed: false });
    expect(deal.updatedAt).toEqual(expect.any(String));
    expect(deal.merchantConfirmedAt).toEqual(expect.any(String));
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
