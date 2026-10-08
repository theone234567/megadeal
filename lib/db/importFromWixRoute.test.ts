import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { exportWix, type WixReader } from "./exportWix";

/**
 * Admin > Moving off Wix > "Copy data from Wix" (app/api/admin/import-from-wix):
 * reads Wix through the site, and rehearses or runs the import into the
 * new database, with the switch-day rules.
 */

const SITE = "https://megadeal.co.nz";
let pglite: PGlite;
let db: Sql;
let admin = true;
let backend: "wix" | "postgres" = "wix";
let maintenance = false;

/** A stand-in for Wix's API: pages of `size`, with products behind a cursor. */
function fakeWix(collections: Record<string, any[]>, products: any[], opts: { failOn?: string } = {}): WixReader {
  return {
    items: {
      query: (name: string) => ({
        limit: (n: number) => ({
          skip: (k: number) => ({
            find: async () => {
              if (name === opts.failOn) throw new Error("WDE0025: collection does not exist");
              return { items: (collections[name] ?? []).slice(k, k + n) };
            },
          }),
        }),
      }),
    },
    productsV3: {
      // The real SDK's shape: search first, then the extra details, which
      // are left out (as Wix does) unless asked for there.
      searchProducts: async (search: any, options: { fields?: string[] }) => {
        if (!options?.fields?.includes("ALL_CATEGORIES_INFO")) products = products.map(({ allCategoriesInfo: _, ...p }: any) => p);
        const start = search.cursorPaging.cursor ? Number(search.cursorPaging.cursor) : 0;
        const page = products.slice(start, start + 100);
        const next = start + 100 < products.length ? String(start + 100) : null;
        return { products: page, pagingMetadata: { hasNext: Boolean(next), cursors: { next } } };
      },
    },
  };
}

const merchants = Array.from({ length: 150 }, (_, i) => ({ _id: `m${i}`, email: `biz${i}@example.nz`, businessName: `Business ${i}`, status: "Approved" }));
let wix: WixReader = fakeWix({ Merchants: merchants }, []);

vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/wixAdmin", () => ({ createWixAdminClient: () => wix }));
vi.mock("@/lib/maintenance", () => ({ maintenanceOn: () => maintenance }));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => backend, withDb: (fn: (db: Sql) => unknown) => fn(db) }));

async function post(mode: string) {
  const { POST } = await import("@/app/api/admin/import-from-wix/route");
  const res = await POST(new NextRequest(`${SITE}/api/admin/import-from-wix`, { method: "POST", headers: { "content-type": "application/json", origin: SITE }, body: JSON.stringify({ mode }) }));
  return { status: res.status, body: await res.json() };
}
const businesses = async () => Number((await pglite.query<{ n: number }>("select count(*)::int as n from public.merchants")).rows[0].n);

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(() => {
  admin = true;
  backend = "wix";
  maintenance = false;
  wix = fakeWix({ Merchants: merchants }, []);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reading Wix", () => {
  it("reads every page of every collection, and the products", async () => {
    const products = Array.from({ length: 230 }, (_, i) => ({ id: `p${i}` }));
    const r = await exportWix(fakeWix({ Merchants: merchants, Deals: [{ _id: "d1" }] }, products));
    expect(r.counts).toMatchObject({ Merchants: 150, Deals: 1, EmailSignups: 0, StoresProducts: 230 });
    expect(r.failed).toEqual({});
  });

  it("asks Wix for each product's categories, which live deals need", async () => {
    // The real import (8 Oct 2026) refused every live deal: the details were
    // asked for in the wrong place, so Wix sent products without categories.
    const r = await exportWix(fakeWix({}, [{ id: "p1", allCategoriesInfo: { categories: [{ id: "food" }] } }]));
    expect(r.data.StoresProducts?.[0].allCategoriesInfo).toEqual({ categories: [{ id: "food" }] });
  });

  it("says which part it couldn't read, rather than carrying on without it", async () => {
    const r = await exportWix(fakeWix({ Merchants: merchants }, [], { failOn: "ContactMessages" }));
    expect(Object.keys(r.failed)).toEqual(["ContactMessages"]);
    expect(r.counts.Merchants).toBe(150);
  });
});

describe("copying from Wix", () => {
  it("is for admins only", async () => {
    admin = false;
    expect((await post("rehearse")).status).toBe(401);
  });

  it("a rehearsal copies everything, reports it, and keeps nothing", async () => {
    const { status, body } = await post("rehearse");
    expect(status).toBe(200);
    expect(body.committed).toBe(false);
    expect(body.counts.Merchants).toEqual({ exported: 150, imported: 150 });
    expect(await businesses()).toBe(0);
  });

  it("for real only once changes are paused", async () => {
    const refused = await post("import");
    expect(refused.status).toBe(409);
    expect(refused.body.error).toMatch(/MAINTENANCE_MODE/);
    expect(await businesses()).toBe(0);

    maintenance = true;
    const { status, body } = await post("import");
    expect(status).toBe(200);
    expect(body.committed).toBe(true);
    expect(await businesses()).toBe(150);
  });

  it("running it again replaces the earlier copy, not adds to it", async () => {
    maintenance = true;
    await post("import");
    await post("import");
    expect(await businesses()).toBe(150);
  });

  it("won't import while part of Wix couldn't be read", async () => {
    maintenance = true;
    await pglite.exec("delete from public.slug_redirects; delete from public.merchant_activity; delete from public.deals; delete from public.merchants;");
    wix = fakeWix({ Merchants: merchants }, [], { failOn: "EmailSignups" });
    const { status, body } = await post("import");
    expect(status).toBe(502);
    expect(body.error).toMatch(/EmailSignups/);
    expect(await businesses()).toBe(0);
  });

  it("never once the site runs on the new database", async () => {
    backend = "postgres";
    maintenance = true;
    const { status, body } = await post("import");
    expect(status).toBe(409);
    expect(body.error).toMatch(/already runs on the new database/);
    expect((await post("rehearse")).status).toBe(409);
  });
});
