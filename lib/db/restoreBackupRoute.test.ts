import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { packBackup, takeBackup } from "./backup";

/** Admin > Moving off Wix > "Restore from a backup" (app/api/admin/restore-backup): only into an empty database. */

const SITE = "https://megadeal.co.nz";
const KEY = "backups/2026-10-20T13-23-00Z.json.gz";
let source: PGlite;
let target: PGlite;
let admin = true;
let backend: "wix" | "postgres" = "postgres";
const objects = new Map<string, Uint8Array>();
const bucket = {
  put: async () => {},
  list: async () => ({
    objects: [...objects.keys()].map((key) => ({ key, uploaded: new Date(), size: objects.get(key)!.length })),
    truncated: false,
  }),
  get: async (key: string) => (objects.has(key) ? { arrayBuffer: async () => objects.get(key)!.slice().buffer } : null),
};
const sqlFor = (db: PGlite): Sql => ({ query: async (text, params) => (await db.query<any>(text, params as any[])).rows });

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { BACKUPS: bucket } }) }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: (req: Request) => req.headers.get("origin") === SITE }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => backend, withDb: (fn: (db: Sql) => unknown) => fn(sqlFor(target)) }));

async function list() {
  const { GET } = await import("@/app/api/admin/restore-backup/route");
  const res = await GET(new NextRequest(`${SITE}/api/admin/restore-backup`));
  return { status: res.status, body: await res.json() };
}
async function restore(body: unknown, origin = SITE) {
  const { POST } = await import("@/app/api/admin/restore-backup/route");
  const res = await POST(new NextRequest(`${SITE}/api/admin/restore-backup`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}
const businesses = async () => Number((await target.query<{ n: number }>("select count(*)::int as n from public.merchants")).rows[0].n);

beforeAll(async () => {
  source = (await createTestDb()).db;
  target = (await createTestDb()).db;
  await source.query("insert into public.merchants (email, business_name, status, category_slug) values ('owner@harbourbistro.co.nz', 'Harbour Bistro', 'Approved', 'food-drink')");
  await source.query("insert into public.email_signups (email, audience, verified) values ('fan@example.nz', 'customer', true)");
  objects.set(KEY, await packBackup(await takeBackup(sqlFor(source))));
  objects.set("backups/2026-10-19T13-23-00Z.json.gz", await packBackup(await takeBackup(sqlFor(source))));
  objects.set("backups/notes.txt", new Uint8Array([1]));
}, 60_000);
afterAll(async () => {
  await source?.close();
  await target?.close();
});
beforeEach(() => {
  admin = true;
  backend = "postgres";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("restoring a backup", () => {
  it("is for admins only, from the admin page", async () => {
    admin = false;
    expect((await list()).status).toBe(401);
    expect((await restore({ key: KEY, mode: "restore" })).status).toBe(401);
    admin = true;
    expect((await restore({ key: KEY, mode: "restore" }, "https://evil.example")).status).toBe(403);
    expect(await businesses()).toBe(0);
  });

  it("lists the database copies, newest first, and nothing else", async () => {
    const { body } = await list();
    expect(body.backups.map((b: { key: string }) => b.key)).toEqual([KEY, "backups/2026-10-19T13-23-00Z.json.gz"]);
  });

  it("only restores a database copy by its name", async () => {
    expect((await restore({ key: "backups/notes.txt", mode: "restore" })).status).toBe(400);
    expect((await restore({ key: "../photos/x.json.gz", mode: "restore" })).status).toBe(400);
    expect((await restore({ key: "backups/2026-01-01T00-00-00Z.json.gz", mode: "restore" })).status).toBe(404);
  });

  it("not while the site still reads Wix", async () => {
    backend = "wix";
    expect((await restore({ key: KEY, mode: "restore" })).status).toBe(409);
  });

  it("a rehearsal checks it all and keeps nothing", async () => {
    const { status, body } = await restore({ key: KEY, mode: "rehearse" });
    expect(status).toBe(200);
    expect(body).toMatchObject({ restored: false, counts: { merchants: 1, email_signups: 1 } });
    expect(await businesses()).toBe(0);
  });

  it("for real, it puts everything back, and says only how much", async () => {
    const { status, body } = await restore({ key: KEY, mode: "restore" });
    expect(status).toBe(200);
    expect(body.restored).toBe(true);
    expect(await businesses()).toBe(1);
    expect(JSON.stringify(body)).not.toContain("fan@example.nz");
  });

  it("never over a database that has data", async () => {
    const { status, body } = await restore({ key: "backups/2026-10-19T13-23-00Z.json.gz", mode: "restore" });
    expect(status).toBe(409);
    expect(body.error).toMatch(/Nothing was restored: merchants already has data/);
    expect(await businesses()).toBe(1);
  });
});
