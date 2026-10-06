import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { createPgAdminClient, type Run } from "./wixShim";
import type { Sql } from "./connection";
import { debitCreditsIfAvailable, incrementCreditsAtomically, incrementFieldAtomically, setFieldsIf } from "../creditsAtomic";
import { queryAllByEmail, queryAllItems } from "../queryAll";
import { CATEGORIES } from "../categories";

/**
 * The site's own server code, unchanged, running on the new database
 * through the Wix stand-in (wixShim.ts). The helpers used here
 * (creditsAtomic, queryAll) are the real ones the routes call.
 */

let pglite: PGlite;
let db: Sql;
let run: Run;

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  run = (fn) => fn(db);
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(async () => {
  await pglite.exec("delete from public.merchant_activity; delete from public.deals; delete from public.merchants; delete from public.email_signups; delete from public.site_settings;");
});

const client = () => createPgAdminClient(run);

async function business(extra: Record<string, unknown> = {}) {
  return client().items.insert("Merchants", {
    _owner: "wix-member-1",
    businessName: "Harbour Bistro",
    email: "Owner@HarbourBistro.co.nz",
    emailVerified: true,
    category: "Food & Drink",
    amenities: "Outdoor seating, Wheelchair access",
    photos: '["https://static.wixstatic.com/media/a.jpg"]',
    creditsBalance: 10,
    status: "Approved",
    website: "",
    ...extra,
  });
}

describe("businesses", () => {
  it("saves and reads back a business the way Wix returns it", async () => {
    const m = await business();
    expect(m).toMatchObject({
      _owner: "wix-member-1",
      businessName: "Harbour Bistro",
      category: "Food & Drink",
      amenities: "Outdoor seating, Wheelchair access",
      photos: '["https://static.wixstatic.com/media/a.jpg"]',
      creditsBalance: 10,
    });
    expect(m._createdDate).toBeInstanceOf(Date);
    // Empty fields are left out, as Wix does.
    expect("website" in m).toBe(false);
    expect(await client().items.get("Merchants", m._id)).toEqual(m);
  });

  it("finds a business by its owner, and by email whatever the capitals", async () => {
    const m = await business();
    const owned = await client().items.query("Merchants").eq("_owner", "wix-member-1").find();
    expect(owned.items.map((x) => x._id)).toEqual([m._id]);
    const byEmail = await queryAllByEmail((e) => client().items.query("Merchants").eq("email", e), "owner@harbourbistro.co.nz", "t");
    expect(byEmail.map((x) => x._id)).toEqual([m._id]);
  });

  it("a business from Wix keeps its Wix id", async () => {
    await db.query("insert into public.merchants (wix_id, email, business_name, status) values ('3f2a9c1e-1111-4222-8333-944455556666', 'w@x.nz', 'From Wix', 'Approved')");
    const m = await client().items.get("Merchants", "3f2a9c1e-1111-4222-8333-944455556666");
    expect(m).toMatchObject({ _id: "3f2a9c1e-1111-4222-8333-944455556666", businessName: "From Wix" });
    const updated = await client().items.update("Merchants", { ...m, bio: "Hello" });
    expect(updated).toMatchObject({ _id: m!._id, bio: "Hello" });
  });

  it("updates what changed and refuses a field it doesn't know", async () => {
    const m = await business();
    const updated = await client().items.update("Merchants", { ...m, phone: "09 123 4567", status: "Pending" });
    expect(updated).toMatchObject({ phone: "09 123 4567", status: "Pending", businessName: "Harbour Bistro" });
    await expect(client().items.update("Merchants", { ...m, favouriteColour: "purple" })).rejects.toThrow(/Unknown field favouriteColour/);
    await expect(client().items.update("Merchants", { ...m, category: "Gambling" })).rejects.toThrow(/Unknown category/);
  });

  it("pages through everything (lib/queryAll.ts)", async () => {
    for (let i = 0; i < 3; i++) await business({ email: `b${i}@x.nz`, _owner: `m${i}` });
    expect(await queryAllItems(() => client().items.query("Merchants"), "t")).toHaveLength(3);
    expect((await client().items.query("Merchants").limit(2).find()).items).toHaveLength(2);
    expect((await client().items.query("Merchants").limit(2).skip(2).find()).items).toHaveLength(1);
    // Not a whole number: the default page, never an error or the text itself.
    expect((await client().items.query("Merchants").limit("2; drop table x" as any).skip(Number.NaN).find()).items).toHaveLength(3);
    expect((await client().items.query("Merchants").limit(1.7).find()).items).toHaveLength(1);
  });
});

describe("credits (lib/creditsAtomic.ts, unchanged)", () => {
  it("debits only when the balance covers it, never below zero", async () => {
    const m = await business({ creditsBalance: 5 });
    const c = client();
    expect(await debitCreditsIfAvailable(c, m._id, 4)).toBe("debited");
    expect(await debitCreditsIfAvailable(c, m._id, 4)).toBe("insufficient");
    expect((await c.items.get("Merchants", m._id))!.creditsBalance).toBe(1);
  });

  it("two debits at once can't both pass", async () => {
    const m = await business({ creditsBalance: 4 });
    const results = await Promise.all([debitCreditsIfAvailable(client(), m._id, 4), debitCreditsIfAvailable(client(), m._id, 4)]);
    expect(results.sort()).toEqual(["debited", "insufficient"]);
    expect((await client().items.get("Merchants", m._id))!.creditsBalance).toBe(0);
  });

  it("refunds, and a refund can't push a balance below zero", async () => {
    const m = await business({ creditsBalance: 1 });
    expect(await incrementCreditsAtomically(client(), m._id, 3)).toBe(true);
    expect((await client().items.get("Merchants", m._id))!.creditsBalance).toBe(4);
    expect(await incrementCreditsAtomically(client(), m._id, -10)).toBe(false);
    expect((await client().items.get("Merchants", m._id))!.creditsBalance).toBe(4);
  });
});

describe("deals", () => {
  const FOOD = CATEGORIES.find((c) => c.slug === "food-drink")!;

  async function draft(extra: Record<string, unknown> = {}) {
    return client().items.insert("Deals", {
      merchantEmail: "owner@harbourbistro.co.nz",
      status: "Draft",
      dealName: "Two-course dinner",
      draftData: '{"dealName":"Two-course dinner"}',
      ...extra,
    });
  }

  /** What /api/deals/create does after taking the credits. */
  async function submit(c: ReturnType<typeof client>, row: Record<string, any>) {
    const res = await c.fetchWithAuth("https://www.wixapis.com/stores/v3/products-with-inventory", {
      method: "POST",
      body: JSON.stringify({ product: { name: row.dealName, variantsInfo: { variants: [{ price: { actualPrice: { amount: "49" } } }] } } }),
    });
    const productId = (await res.json()).product.id;
    await c.fetchWithAuth("https://www.wixapis.com/categories/v1/bulk/categories/add-item", {
      method: "POST",
      body: JSON.stringify({ item: { catalogItemId: productId }, categoryIds: [FOOD.id] }),
    });
    return c.items.update("Deals", { ...row, priceNow: 49, priceWas: 80, status: "Pending Approval", productId, draftData: "" });
  }

  it("saves a draft against its business, with no page yet", async () => {
    await business();
    const d = await draft();
    expect(d).toMatchObject({ status: "Draft", merchantEmail: "Owner@HarbourBistro.co.nz", draftData: '{"dealName":"Two-course dinner"}' });
    expect(d.productId).toBeUndefined();
  });

  it("submitting gives the deal its page address and category, as Wix Stores did", async () => {
    await business();
    const c = client();
    const submitted = await submit(c, await draft());
    expect(submitted).toMatchObject({ status: "Pending Approval", category: "Food & Drink", productId: submitted._id, priceNow: 49 });
    expect("draftData" in submitted).toBe(false);
    // Its address: deal and business (no suburb saved here).
    const { product } = await c.productsV3.getProductBySlug("two-course-dinner-harbour-bistro");
    expect(product).toMatchObject({ id: submitted._id, name: "Two-course dinner", allCategoriesInfo: { categories: [{ id: FOOD.id }] } });
    // A second deal with the same name gets the next address.
    const second = await submit(c, await draft());
    const { product: p2 } = await c.productsV3.getProductBySlug("two-course-dinner-harbour-bistro-2");
    expect(p2?.id).toBe(second._id);
  });

  it("a draft can be claimed for submission once (setFieldsIf, unchanged)", async () => {
    await business();
    const d = await draft();
    const claims = await Promise.all([
      setFieldsIf(client(), "Deals", d._id, { status: "Pending Approval" }, { status: { $eq: "Draft" } }),
      setFieldsIf(client(), "Deals", d._id, { status: "Pending Approval" }, { status: { $eq: "Draft" } }),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    // Handing it back (a failed submission) works once too.
    expect(await setFieldsIf(client(), "Deals", d._id, { status: "Draft" }, { status: { $eq: "Pending Approval" } })).toBeTruthy();
    expect(await setFieldsIf(client(), "Deals", d._id, { status: "Draft" }, { status: { $eq: "Pending Approval" } })).toBeNull();
  });

  it("counts views and clicks in place (incrementFieldAtomically, unchanged)", async () => {
    await business();
    const d = await submit(client(), await draft());
    await Promise.all([1, 2, 3].map(() => incrementFieldAtomically(client(), "Deals", d._id, ["viewCount", "clickCount"], 1)));
    expect(await client().items.get("Deals", d._id)).toMatchObject({ viewCount: 3, clickCount: 3 });
    const found = await client().items.query("Deals").eq("productId", d._id).find();
    expect(found.items.map((x) => x._id)).toEqual([d._id]);
  });

  it("remembers who paused a deal", async () => {
    await business();
    const d = await submit(client(), await draft());
    const live = await client().items.update("Deals", { ...d, status: "Live" });
    const byBusiness = await client().items.update("Deals", { ...live, status: "Paused" });
    expect(byBusiness.pausedBy).toBe("business");
    const resumed = await client().items.update("Deals", { ...byBusiness, status: "Live" });
    expect(resumed.pausedBy).toBeUndefined();
    const byAdmin = await client().items.update("Deals", { ...resumed, status: "Paused", pausedBy: "admin" });
    expect(byAdmin.pausedBy).toBe("admin");
  });

  it("an admin's price change goes onto the deal (the product edit)", async () => {
    await business();
    const c = client();
    const d = await submit(c, await draft());
    const get = await c.fetchWithAuth(`https://www.wixapis.com/stores/v3/products/${d.productId}`, { method: "GET" });
    const { product } = await get.json();
    expect(product.variantsInfo.variants).toHaveLength(1);
    const res = await c.fetchWithAuth(`https://www.wixapis.com/stores/v3/products/${d.productId}`, {
      method: "PATCH",
      body: JSON.stringify({ product: { name: "Three-course dinner", variantsInfo: { variants: [{ price: { actualPrice: { amount: "59" }, compareAtPrice: { amount: "90" } } }] } } }),
    });
    expect(res.ok).toBe(true);
    expect(await c.items.get("Deals", d._id)).toMatchObject({ dealName: "Three-course dinner", priceNow: 59, priceWas: 90 });
  });

  it("lists a business's deals and activity by its email", async () => {
    await business();
    await draft();
    await client().items.insert("MerchantActivity", { merchantEmail: "OWNER@harbourbistro.co.nz", type: "credit", amount: -4, description: "Deal submitted" });
    const deals = await queryAllByEmail((e) => client().items.query("Deals").eq("merchantEmail", e), "Owner@HarbourBistro.co.nz", "t");
    const activity = await queryAllByEmail((e) => client().items.query("MerchantActivity").eq("merchantEmail", e), "owner@harbourbistro.co.nz", "t");
    expect(deals).toHaveLength(1);
    expect(activity).toMatchObject([{ type: "credit", amount: -4, description: "Deal submitted" }]);
    expect((await client().items.query("Deals").ne("status", "Draft").find()).items).toHaveLength(0);
  });
});

describe("email sign-ups and settings", () => {
  it("stores tokens hashed, finds them by the token, never gives them back", async () => {
    const s = await client().items.insert("EmailSignups", {
      email: "fan@example.co.nz",
      audience: "customer",
      source: "coming-soon",
      verified: false,
      verifyToken: "a".repeat(64),
      unsubscribed: false,
      unsubscribeToken: "b".repeat(64),
    });
    expect(s.verifyToken).toBeUndefined();
    const [raw] = await db.query("select verify_token_hash, unsubscribe_token_hash from public.email_signups");
    expect(JSON.stringify(raw)).not.toContain("a".repeat(64));
    const found = await client().items.query("EmailSignups").eq("verifyToken", "a".repeat(64)).find();
    expect(found.items.map((x) => x._id)).toEqual([s._id]);
    // Confirming clears the token, so the link works once.
    await client().items.update("EmailSignups", { ...found.items[0], verified: true, verifyToken: "" });
    expect((await client().items.query("EmailSignups").eq("verifyToken", "a".repeat(64)).find()).items).toHaveLength(0);
    expect((await client().items.query("EmailSignups").eq("verifyToken", "").find()).items).toHaveLength(0);
  });

  it("keeps site settings", async () => {
    await client().items.insert("SiteSettings", { key: "rudenessCheck", value: "off" });
    const [row] = (await client().items.query("SiteSettings").eq("key", "rudenessCheck").limit(1).find()).items;
    await client().items.update("SiteSettings", { ...row, value: "on" });
    expect((await client().items.query("SiteSettings").eq("key", "rudenessCheck").find()).items[0]).toMatchObject({ value: "on" });
  });
});
