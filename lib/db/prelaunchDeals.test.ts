import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { createPgAdminClient } from "./wixShim";
import { loadLiveDeals } from "./publicReads";
import type { Sql } from "./connection";

/**
 * Live deals before launch (lib/siteConfig.ts DEALS_OPEN), on the real
 * routes and database: a business runs 1 Everyday Deal and 1 Flash Deal at
 * a time, free; and a business marked as a test is never public.
 */

let pglite: PGlite;
let db: Sql;
const login = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const member = { id: login(1), email: "owner@harbourbistro.co.nz", loginEmailVerified: true, nickname: null };
let admin = false;

vi.mock("@/lib/memberAuth", () => ({ getVerifiedMember: async () => member }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => createPgAdminClient((fn) => fn(db)) }));
// Platform settings and the rest read the same test database (T211).
vi.mock("@/lib/db/connection", async (orig) => ({ ...(await orig<typeof import("./connection")>()), withDb: (fn: (d: Sql) => unknown) => fn(db) }));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async () => ({ ok: true }) }));
vi.mock("@/lib/metaCapi", () => ({ sendMetaCapiEvent: async () => {} }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {}, auditTarget: (n: unknown) => String(n) }));
vi.mock("@/lib/indexNowDeal", () => ({ notifyDealChanged: () => {}, notifyBusinessChanged: () => {} }));
// Before launch, with live deals on.
vi.mock("@/lib/siteConfig", async (orig) => ({
  ...(await orig<typeof import("../siteConfig")>()),
  SITE_LAUNCHED: false,
  DEALS_OPEN: true,
  PRELAUNCH_FREE_DEALS: true,
}));
vi.mock("@/lib/aiReview", async (orig) => ({ ...(await orig<typeof import("../aiReview")>()), reviewWithAi: async () => null }));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  await db.query("insert into auth.users (id) values ($1)", [login(1)]);
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(async () => {
  await pglite.exec("delete from public.merchant_activity; delete from public.deals; delete from public.merchants; delete from public.rate_limits; delete from public.site_settings;");
  admin = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const request = (method: string, body?: unknown) =>
  new NextRequest("https://megadeal.co.nz/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function call(handler: (...a: any[]) => Promise<Response>, ...args: any[]) {
  const res = await handler(...args);
  return { status: res.status, body: await res.json() };
}

const SIGNUP = {
  businessName: "Harbour Bistro",
  contactName: "Sam",
  contactPhone: "021 123 4567",
  legalBusinessName: "Harbour Bistro Limited",
  nzbn: "9429000000001",
  phone: "09 123 4567",
  address: "1 Quay Street, Auckland CBD, Auckland 1010",
  city: "Auckland",
  suburb: "Auckland CBD",
  category: "Food & Drink",
  website: "harbourbistro.co.nz",
  bookingEmail: "book@harbourbistro.co.nz",
  priceRange: "$$",
  amenities: "Outdoor seating",
  agreedToTerms: true,
};
const DEAL = {
  dealName: "Two-course dinner",
  description: "Any main and dessert.",
  terms: "Dine-in only.",
  priceNow: 49,
  priceWas: 80,
  isFlash: false,
  durationDays: 14,
  bookingRequirement: "recommended",
  category: "Food & Drink",
  photoUrl: "https://static.wixstatic.com/media/deal.jpg",
  photoMediaId: "m1",
};

async function approvedBusiness(credits: number) {
  const apply = await import("@/app/api/merchants/apply/route");
  expect((await call(apply.POST, request("POST", SIGNUP))).status).toBe(200);
  await db.query("update public.merchants set status = 'Approved', credits_balance = $1", [credits]);
}

describe("deals before launch", () => {
  it("are free, 1 Everyday and 1 Flash at a time", async () => {
    await approvedBusiness(180);
    const create = await import("@/app/api/deals/create/route");

    expect((await call(create.POST, request("POST", DEAL))).status).toBe(200);
    // A second Everyday Deal waits until the first ends.
    const second = await call(create.POST, request("POST", { ...DEAL, dealName: "Lunch for two" }));
    expect(second.status).toBe(403);
    expect(second.body.error).toMatch(/1 Everyday Deal at a time/);
    // A Flash Deal is its own slot.
    expect((await call(create.POST, request("POST", { ...DEAL, dealName: "Tonight only", isFlash: true, durationMinutes: 120 }))).status).toBe(200);

    // Nothing was charged: the 180 credits are untouched.
    expect(await db.query("select credits_balance from public.merchants")).toEqual([{ credits_balance: 180 }]);
    expect((await db.query("select credits_charged from public.deals")).map((r: any) => r.credits_charged)).toEqual([0, 0]);
  });

  it("go live once approved, unless the business is a test", async () => {
    await approvedBusiness(180);
    const create = await import("@/app/api/deals/create/route");
    const submitted = await call(create.POST, request("POST", DEAL));
    admin = true;
    const adminDeal = await import("@/app/api/admin/deals/[id]/route");
    expect((await call(adminDeal.PATCH, request("PATCH", { status: "Live" }), params(submitted.body.item._id))).status).toBe(200);
    expect((await loadLiveDeals(db)).map((d) => d.name)).toEqual(["Two-course dinner"]);

    // Marked as a test business: gone from everything public.
    const [{ id }] = await db.query("select id from public.merchants");
    const adminMerchant = await import("@/app/api/admin/merchants/[id]/route");
    expect((await call(adminMerchant.PATCH, request("PATCH", { isTest: true }), params(id))).status).toBe(200);
    expect(await loadLiveDeals(db)).toEqual([]);
    expect(await db.query("select count(*)::int as n from public.public_deals")).toEqual([{ n: 0 }]);
  });
});
