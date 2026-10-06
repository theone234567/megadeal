import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { importWixExport, type WixExport } from "./importWix";
import { loadLiveDeals, readBusinessBySlug, resolveBusinessRedirect, resolveDealRedirect } from "./publicReads";
import { CATEGORIES } from "../categories";
import type { Sql } from "./sql";

const FOOD = CATEGORIES.find((c) => c.slug === "food-drink")!;
const NOW = Date.now();
const later = new Date(NOW + 10 * 86_400_000).toISOString();
const earlier = new Date(NOW - 86_400_000).toISOString();

const product = (id: string, slug: string) => ({
  id,
  slug,
  name: `Deal ${slug}`,
  variantsInfo: { variants: [{ price: { actualPrice: { amount: "20" }, compareAtPrice: { amount: "40" } } }] },
  allCategoriesInfo: { categories: [{ id: FOOD.id }] },
});

// A small export with the untidiness real data has.
const EXPORT: WixExport = {
  Merchants: [
    { _id: "3f2a9c1e-1111-4222-8333-944455556666", _owner: "member-1", email: "Owner@Bistro.nz", businessName: "Bistro", status: "Approved", website: "bistro.nz", creditsBalance: 8, category: "Food & Drink" },
    { _id: "aaaaaaaa-1111-4222-8333-944455556666", email: "owner@bistro.nz", businessName: "Bistro (duplicate)", status: "Pending" },
    { _id: "bbbbbbbb-1111-4222-8333-944455556666", email: "cafe@example.nz", businessName: "Cafe", status: "Suspended", bookingUrl: "javascript:alert(1)" },
  ],
  StoresProducts: [product("p1", "live-deal"), product("p2", "paused-deal")],
  Deals: [
    { _id: "d1", productId: "p1", merchantEmail: "owner@bistro.nz", status: "Live", firstPublishedAt: earlier, expiresAt: later, everLive: true, dealCode: "MEGA-AAAAA" },
    { _id: "d2", productId: "p2", merchantEmail: "owner@bistro.nz", status: "Paused", firstPublishedAt: earlier, expiresAt: later },
    { _id: "d3", merchantEmail: "owner@bistro.nz", status: "Draft", dealName: "Half-written", draftData: "{}" },
    { _id: "d4", productId: "gone", merchantEmail: "owner@bistro.nz", status: "Live", dealName: "Orphan", priceNow: 10 },
    { _id: "d5", productId: "p9", merchantEmail: "nobody@x.nz", status: "Live" },
  ],
  MerchantActivity: [
    { _id: "a1", merchantEmail: "OWNER@bistro.nz", type: "credit", amount: 12, description: "Welcome credits" },
    { _id: "a2", merchantEmail: "nobody@x.nz", type: "deal", description: "Lost" },
  ],
  EmailSignups: [
    { _id: "s1", email: "fan@x.nz", audience: "customer", verified: false, verifyToken: "t1" },
    { _id: "s2", email: "Fan@x.nz", audience: "customer", verified: true, unsubscribeToken: "u2" },
    { _id: "s3", email: "gone@x.nz", audience: "customer", verified: true },
    { _id: "s4", email: "gone@x.nz", audience: "customer", unsubscribed: true },
  ],
  ContactMessages: [{ _id: "c1", name: "Pat", email: "pat@x.nz", message: "Hi" }],
  SiteSettings: [{ _id: "x", key: "rudenessCheck", value: "off" }],
};

let pglite: PGlite;
let db: Sql;

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});

describe("importing the Wix export", () => {
  it("a rehearsal runs everything, reports, and leaves the database empty", async () => {
    const report = await importWixExport(db, EXPORT, { commit: false });
    expect(report.committed).toBe(false);
    expect(report.counts).toEqual({
      Merchants: { exported: 3, imported: 2 },
      Deals: { exported: 5, imported: 4 },
      MerchantActivity: { exported: 2, imported: 1 },
      EmailSignups: { exported: 4, imported: 2 },
      ContactMessages: { exported: 1, imported: 1 },
      SiteSettings: { exported: 1, imported: 1 },
    });
    expect(await db.query("select count(*)::int as n from public.merchants")).toEqual([{ n: 0 }]);
  });

  it("lists every problem with its original value", async () => {
    const { issues, pausedDeals } = await importWixExport(db, EXPORT, { commit: false });
    const problems = issues.map((i) => `${i.field}: ${i.problem}`);
    expect(problems).toEqual(
      expect.arrayContaining([
        "email: a second business with this email, not imported",
        "bookingUrl: not an http(s) link, left out",
        "productId: its Stores product is missing, imported without a page",
        "status: no Stores product, imported as Cancelled",
        "merchantEmail: no business with this email, deal not imported",
        "merchantEmail: no business with this email, not imported",
      ])
    );
    expect(pausedDeals.map((d) => d.name)).toEqual(["Deal paused-deal"]);
  });

  it("the real import puts the storefront back exactly", async () => {
    const report = await importWixExport(db, EXPORT, { commit: true });
    expect(report.committed).toBe(true);
    // Readable addresses: the deal's from its name and business, and the
    // Wix ones redirect to them.
    expect((await loadLiveDeals(db)).map((d) => [d.slug, d.businessName, d.dealCode])).toEqual([["deal-live-deal-bistro", "Bistro", "MEGA-AAAAA"]]);
    expect(await resolveDealRedirect(db, "live-deal")).toBe("deal-live-deal-bistro");
    expect((await readBusinessBySlug(db, "bistro"))?.businessName).toBe("Bistro");
    expect(await resolveBusinessRedirect(db, "bistro-3f2a9c1e")).toBe("bistro");
    // A paused deal was public, so its old address still leads to it.
    expect(await resolveDealRedirect(db, "paused-deal")).toBe("deal-paused-deal-bistro");
    expect(await db.query("select website, credits_balance, wix_owner_id from public.merchants where business_name = 'Bistro'")).toEqual([
      { website: "https://bistro.nz", credits_balance: 8, wix_owner_id: "member-1" },
    ]);
    // Sign-ups: one per person, an unsubscribe always wins.
    expect(await db.query("select email, verified, unsubscribed from public.email_signups order by email")).toEqual([
      { email: "fan@x.nz", verified: true, unsubscribed: false },
      { email: "gone@x.nz", verified: true, unsubscribed: true },
    ]);
    expect(await db.query("select value from public.site_settings")).toEqual([{ value: "off" }]);
  });

  it("won't import over existing data unless told to replace it", async () => {
    await expect(importWixExport(db, EXPORT, { commit: true })).rejects.toThrow(/already has businesses/);
    const again = await importWixExport(db, EXPORT, { commit: true, replace: true });
    expect(again.counts.Deals.imported).toBe(4);
    expect(await db.query("select count(*)::int as n from public.deals")).toEqual([{ n: 4 }]);
  });
});
