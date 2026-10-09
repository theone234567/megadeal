import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { deleteBusinessCompletely } from "./deleteBusiness";

/** Admin > a business > Delete, with all its deals (test businesses). */

let pglite: PGlite;
let db: Sql;
let launched = true;
const deletedLogins: string[] = [];

vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {}, auditTarget: (n: unknown) => String(n) }));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => "postgres", withDb: (fn: (db: Sql) => unknown) => fn(db) }));
vi.mock("@/lib/siteConfig", async (orig) => ({
  ...(await orig<typeof import("../siteConfig")>()),
  get SITE_LAUNCHED() {
    return launched;
  },
}));
vi.mock("@/lib/supabaseAuth", async (orig) => ({
  ...(await orig<typeof import("../supabaseAuth")>()),
  adminDeleteUser: async (id: string) => (deletedLogins.push(id), { ok: true, data: {} }),
}));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(async () => {
  await pglite.exec("delete from public.deals; delete from public.merchants;");
  launched = true;
  deletedLogins.length = 0;
});

async function testBusiness(dealStatus: string): Promise<string> {
  const [m] = await db.query<{ id: string }>(
    `insert into public.merchants (email, business_name, suburb, status, credits_balance, category_slug)
     values ('test3@example.nz', 'Test Bistro', 'Ponsonby', 'Approved', 7, 'food-drink') returning id`
  );
  await db.query(
    `insert into public.deals (merchant_id, name, description, category_slug, price_now, price_was, status, first_published_at, expires_at)
     values ($1, 'Two-course dinner', 'Mains and dessert', 'food-drink', 49, 80, $2, now() - interval '1 day', now() + interval '7 days'),
            ($1, 'Old offer', 'Gone', 'food-drink', 10, 20, 'Cancelled', now() - interval '9 days', now() - interval '2 days')`,
    [m.id, dealStatus]
  );
  await db.query("insert into public.merchant_activity (merchant_id, type, amount, description) values ($1, 'credit', 12, 'Welcome credits')", [m.id]);
  return m.id;
}
const counts = async () =>
  (await db.query("select (select count(*) from public.merchants)::int as m, (select count(*) from public.deals)::int as d, (select count(*) from public.merchant_activity)::int as a"))[0];

describe("deleting a business with all its deals", () => {
  it("after launch, refuses while a deal is live; otherwise removes everything in one go", async () => {
    const id = await testBusiness("Live");
    const refused = await deleteBusinessCompletely(db, id, { launched: true });
    expect(refused).toMatchObject({ ok: false, status: 409 });
    expect(await counts()).toEqual({ m: 1, d: 2, a: 1 });
    await db.query("update public.deals set status = 'Cancelled' where merchant_id = $1", [id]);
    expect(await deleteBusinessCompletely(db, id, { launched: true })).toMatchObject({ ok: true, deals: 2, email: "test3@example.nz" });
    expect(await counts()).toEqual({ m: 0, d: 0, a: 0 });
  });

  it("before launch nothing is public, so a live deal doesn't stop it", async () => {
    const id = await testBusiness("Live");
    expect(await deleteBusinessCompletely(db, id, { launched: false })).toMatchObject({ ok: true, deals: 2 });
    expect(await counts()).toEqual({ m: 0, d: 0, a: 0 });
  });

  it("from admin: only with the name typed exactly, and the login too if asked", async () => {
    launched = false;
    const id = await testBusiness("Live");
    const { DELETE } = await import("@/app/api/admin/merchants/[id]/route");
    const send = (body: unknown, origin = "https://megadeal.co.nz") =>
      DELETE(
        new NextRequest(`https://megadeal.co.nz/api/admin/merchants/${id}`, { method: "DELETE", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) }),
        { params: Promise.resolve({ id }) }
      );
    expect((await send({ everything: true, confirm: "Test Bistro" }, "https://evil.example")).status).toBe(403);
    expect((await send({ everything: true, confirm: "test bistr" })).status).toBe(400);
    expect(await counts()).toEqual({ m: 1, d: 2, a: 1 });
    await db.query("update public.merchants set owner_id = null where id = $1", [id]);
    const res = await send({ everything: true, confirm: "Test Bistro", login: false });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, deletedDeals: 2 });
    expect(await counts()).toEqual({ m: 0, d: 0, a: 0 });
    expect(deletedLogins).toEqual([]);
  });
});
