import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db/testDb";

/**
 * Business email opt-outs are kept in the database (backed up nightly) as
 * well as Cloudflare KV, so an unsubscribe is never lost and emails never
 * start again on their own. Real Postgres (PGlite), every migration.
 */

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
const kv = new Map<string, string>();

vi.mock("@/lib/db/connection", () => ({
  withDb: async (fn: (sql: { query: (text: string, params?: unknown[]) => Promise<unknown[]> }) => unknown) =>
    fn({ query: async (text, params) => (await db.query(text, params as any[])).rows }),
}));
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));

const optOut = await import("./businessEmailOptOut");
const ID = "3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b";
const OTHER = "11111111-2222-4333-8444-555555555555";

beforeAll(async () => {
  db = (await createTestDb()).db;
});

beforeEach(async () => {
  kv.clear();
  await db.exec("delete from public.site_settings where key like 'biz-email-opt-out:%'");
});

describe("business email opt-outs in the database", () => {
  it("are saved there and still count if KV is wiped", async () => {
    expect(await optOut.optOutBusiness(ID)).toBe(true);
    kv.clear();
    expect([...(await optOut.optedOutBusinesses([ID, OTHER]))]).toEqual([ID]);
  });

  it("opting out twice keeps the first date", async () => {
    await optOut.optOutBusiness(ID);
    const first = (await db.query<{ value: string }>("select value from public.site_settings")).rows[0].value;
    await new Promise((r) => setTimeout(r, 5));
    await optOut.optOutBusiness(ID);
    expect((await db.query<{ value: string }>("select value from public.site_settings")).rows[0].value).toBe(first);
  });

  it("still honours an opt-out made before, kept only in KV", async () => {
    kv.set("biz-email-opt-out:" + OTHER, "2026-10-10T00:00:00Z");
    expect(await optOut.optedOutBusinesses([ID, OTHER])).toEqual(new Set([OTHER]));
  });

  it("turning emails back on clears both places", async () => {
    await optOut.optOutBusiness(ID);
    expect(await optOut.optInBusiness(ID)).toBe(true);
    expect((await optOut.optedOutBusinesses([ID])).size).toBe(0);
    expect(kv.size).toBe(0);
  });
});
