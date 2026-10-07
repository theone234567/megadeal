import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { unpackBackup } from "./backup";
import type { WixReader } from "./exportWix";

/** Admin > Moving off Wix > "Save a copy" (app/api/admin/save-copy): a copy of the database or of Wix, kept in the private bucket. */

const SITE = "https://megadeal.co.nz";
let pglite: PGlite;
let admin = true;
let backend: "wix" | "postgres" = "postgres";
let bound = true;
let failOn: string | null = null;
const stored = new Map<string, Uint8Array>();
const bucket = {
  put: async (key: string, value: Uint8Array) => void stored.set(key, value),
  list: async () => ({ objects: [], truncated: false }),
};

const collections: Record<string, any[]> = {
  Merchants: [{ _id: "m1", email: "biz@example.nz", businessName: "Harbour & Hearth" }],
  EmailSignups: [{ _id: "s1", email: "fan@example.nz", audience: "customer" }],
};
const wix: WixReader = {
  items: {
    query: (name: string) => ({
      limit: (n: number) => ({
        skip: (k: number) => ({
          find: async () => {
            if (name === failOn) throw new Error("Wix is down");
            return { items: (collections[name] ?? []).slice(k, k + n) };
          },
        }),
      }),
    }),
  },
  productsV3: { searchProducts: async () => ({ products: [{ id: "p1" }], pagingMetadata: { hasNext: false } }) },
};

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: bound ? { BACKUPS: bucket } : {} }) }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/wixAdmin", () => ({ createWixAdminClient: () => wix }));
vi.mock("@/lib/db/connection", () => ({
  dataBackend: () => backend,
  withDb: (fn: (db: Sql) => unknown) => fn({ query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows }),
}));

async function save(what: string) {
  const { POST } = await import("@/app/api/admin/save-copy/route");
  const res = await POST(new NextRequest(`${SITE}/api/admin/save-copy`, { method: "POST", headers: { "content-type": "application/json", origin: SITE }, body: JSON.stringify({ what }) }));
  return { status: res.status, body: await res.json() };
}

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  await pglite.query("insert into public.email_signups (email, audience, verified) values ('fan@example.nz', 'customer', true)");
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(() => {
  admin = true;
  backend = "postgres";
  bound = true;
  failOn = null;
  stored.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saving a copy", () => {
  it("is for admins only", async () => {
    admin = false;
    expect((await save("database")).status).toBe(401);
    expect((await save("wix")).status).toBe(401);
    expect(stored.size).toBe(0);
  });

  it("says so when there's nowhere to keep it", async () => {
    bound = false;
    const { status, body } = await save("wix");
    expect(status).toBe(503);
    expect(body.error).toMatch(/BACKUPS/);
  });

  it("of the database: the nightly copy, taken now", async () => {
    const { status, body } = await save("database");
    expect(status).toBe(200);
    expect(body.saved).toMatch(/^backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.json\.gz$/);
    const backup = await unpackBackup(stored.get(body.saved)!);
    expect(backup.format).toBe("megadeal-backup-1");
    expect(backup.tables.email_signups.map((r) => r.email)).toEqual(["fan@example.nz"]);
    // Only where and how much, never what.
    expect(JSON.stringify(body)).not.toContain("fan@example.nz");
  });

  it("of the database: not while the data is still in Wix", async () => {
    backend = "wix";
    expect((await save("database")).status).toBe(409);
    expect(stored.size).toBe(0);
  });

  it("of Wix: everything, apart from the database's copies", async () => {
    backend = "wix";
    const { status, body } = await save("wix");
    expect(status).toBe(200);
    expect(body.saved).toMatch(/^wix-copies\/.+\.json\.gz$/);
    expect(body.counts).toMatchObject({ Merchants: 1, EmailSignups: 1, Deals: 0, StoresProducts: 1 });
    const copy = (await unpackBackup(stored.get(body.saved)!)) as any;
    expect(copy.format).toBe("megadeal-wix-copy-1");
    expect(copy.data.Merchants[0].businessName).toBe("Harbour & Hearth");
    expect(copy.data.StoresProducts).toEqual([{ id: "p1" }]);
  });

  it("of Wix: nothing rather than part of it", async () => {
    failOn = "Deals";
    const { status, body } = await save("wix");
    expect(status).toBe(502);
    expect(body.error).toMatch(/Deals/);
    expect(stored.size).toBe(0);
  });

  it("refuses anything else", async () => {
    expect((await save("everything")).status).toBe(400);
  });
});
