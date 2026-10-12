import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { unpackBackup } from "./backup";

/** Admin > System checks > "Save a copy of the database" (app/api/admin/save-copy), kept in the private bucket. */

const SITE = "https://megadeal.co.nz";
let pglite: PGlite;
let admin = true;
let bound = true;
const stored = new Map<string, Uint8Array>();
const bucket = {
  put: async (key: string, value: Uint8Array) => void stored.set(key, value),
  list: async () => ({ objects: [], truncated: false }),
};

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: bound ? { BACKUPS: bucket } : {} }) }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/db/connection", () => ({
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
  bound = true;
  stored.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saving a copy", () => {
  it("is for admins only", async () => {
    admin = false;
    expect((await save("database")).status).toBe(401);
    expect(stored.size).toBe(0);
  });

  it("says so when there's nowhere to keep it", async () => {
    bound = false;
    const { status, body } = await save("database");
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

  it("refuses anything else", async () => {
    expect((await save("everything")).status).toBe(400);
    // Wix is gone: there's no copy of it to take.
    expect((await save("wix")).status).toBe(400);
  });
});
