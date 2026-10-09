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
let dbDown = false;
vi.mock("./connection", async (orig) => ({
  ...(await orig<typeof import("./connection")>()),
  withDb: async (fn: (db: Sql) => unknown) => {
    if (dbDown) throw new Error("connect ECONNREFUSED db.internal:5432");
    return fn(sqlFor(pglite));
  },
}));
const emailed: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string; html: string }) => (emailed.push(m), true) }));

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
    const { body } = await call("the-real-secret");
    expect(body.skipped).toBeTruthy();
    // It still asks the new database something, so Supabase doesn't pause it.
    expect(body.database).toBe("awake");
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
    expect(emailed).toHaveLength(0);
  });

  it("emails the owner when a night's copy fails, without the details", async () => {
    vi.stubEnv("CRON_SECRET", "the-real-secret");
    vi.stubEnv("DATA_BACKEND", "postgres");
    vi.stubEnv("ADMIN_NOTIFY_EMAIL", "owner@example.nz");
    vi.spyOn(console, "error").mockImplementation(() => {});
    dbDown = true;
    stored.clear();
    expect((await call("the-real-secret")).status).toBe(500);
    dbDown = false;
    expect(stored.size).toBe(0);
    expect(emailed).toHaveLength(1);
    expect(emailed[0].to).toBe("owner@example.nz");
    expect(emailed[0].subject).toMatch(/backup didn't complete/);
    expect(emailed[0].html).not.toContain("db.internal");
  });
});
