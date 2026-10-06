import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { unpackBackup } from "./backup";

/** The nightly job (app/api/cron/backup): only for the scheduler, and what it stores can be put back. */

let pglite: PGlite;
const sqlFor = (db: PGlite): Sql => ({ query: async (text, params) => (await db.query(text, params as any[])).rows as any[] });
const stored = new Map<string, Uint8Array>();
const bucket = {
  put: async (key: string, value: Uint8Array) => void stored.set(key, value),
  list: async () => ({ objects: [], truncated: false }),
};
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { BACKUPS: bucket } }) }));
vi.mock("./connection", async (orig) => ({
  ...(await orig<typeof import("./connection")>()),
  withDb: async (fn: (db: Sql) => unknown) => fn(sqlFor(pglite)),
}));

const call = async (secret?: string) => {
  const { POST } = await import("@/app/api/cron/backup/route");
  const res = await POST(new NextRequest("https://megadeal.co.nz/api/cron/backup", { method: "POST", headers: secret ? { authorization: `Bearer ${secret}` } : {} }));
  return { status: res.status, body: await res.json() };
};

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  await pglite.query("insert into public.email_signups (email, audience, verified) values ('fan@example.nz', 'customer', true)");
}, 60_000);
afterAll(async () => {
  vi.unstubAllEnvs();
  await pglite?.close();
});

describe("nightly backup route", () => {
  it("only answers the scheduler", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("anything")).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    expect((await call()).status).toBe(401);
    expect((await call("a-guess")).status).toBe(401);
    expect(stored.size).toBe(0);
  });

  it("does nothing while the data is still in Wix", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    vi.stubEnv("DATA_BACKEND", "wix");
    expect((await call("the-real-secret")).body.skipped).toBeTruthy();
    expect(stored.size).toBe(0);
  });

  it("stores a copy that unpacks to the data, and says only how much", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    vi.stubEnv("DATA_BACKEND", "postgres");
    const { status, body } = await call("the-real-secret");
    expect(status).toBe(200);
    expect(body.saved).toMatch(/^backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.json\.gz$/);
    expect(body.rows.email_signups).toBe(1);
    expect(JSON.stringify(body)).not.toContain("fan@example.nz");
    const backup = await unpackBackup(stored.get(body.saved)!);
    expect(backup.tables.email_signups[0]).toMatchObject({ email: "fan@example.nz" });
  });
});
