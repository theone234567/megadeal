import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";

/** Admin > Moving off Wix > "Bring over unsubscribes from Wix" (app/api/admin/carry-unsubscribes). */

const SITE = "https://megadeal.co.nz";
let pglite: PGlite;
let db: Sql;
let backend: "wix" | "postgres" = "postgres";
let wixSignups: Record<string, unknown>[] = [];

vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: { query: () => ({ limit: (n: number) => ({ skip: (k: number) => ({ find: async () => ({ items: wixSignups.slice(k, k + n) }) }) }) }) },
  }),
}));
vi.mock("@/lib/db/connection", () => ({ dataBackend: () => backend, withDb: (fn: (db: Sql) => unknown) => fn(db) }));

async function press() {
  const { POST } = await import("@/app/api/admin/carry-unsubscribes/route");
  const res = await POST(new NextRequest(`${SITE}/api/admin/carry-unsubscribes`, { method: "POST", headers: { origin: SITE } }));
  return { status: res.status, body: await res.json() };
}
const state = async () =>
  Object.fromEntries((await pglite.query<{ email: string; audience: string; unsubscribed: boolean }>("select email, audience, unsubscribed from public.email_signups order by email, audience")).rows.map((r) => [`${r.email}|${r.audience}`, r.unsubscribed]));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});
beforeEach(async () => {
  backend = "postgres";
  await pglite.exec(`delete from public.email_signups;
    insert into public.email_signups (email, audience, verified) values
      ('ana@example.nz', 'customer', true), ('ana@example.nz', 'merchant', true), ('ben@example.nz', 'customer', true), ('cam@example.nz', 'customer', true);`);
});

describe("bringing over unsubscribes from Wix", () => {
  it("unsubscribes those who unsubscribed in Wix, for the right list, whatever the capitals", async () => {
    wixSignups = [
      { email: "Ana@Example.nz", audience: "customer", unsubscribed: true },
      { email: "ben@example.nz", audience: "customer", unsubscribed: false },
      { email: "zed@example.nz", unsubscribed: true },
    ];
    const { status, body } = await press();
    expect(status).toBe(200);
    expect(body).toEqual({ unsubscribedInWix: 2, newlyUnsubscribed: 1 });
    expect(await state()).toEqual({ "ana@example.nz|customer": true, "ana@example.nz|merchant": false, "ben@example.nz|customer": false, "cam@example.nz|customer": false });
  });

  it("never subscribes anyone, and is safe to press again", async () => {
    await pglite.exec("update public.email_signups set unsubscribed = true where email = 'cam@example.nz'");
    wixSignups = [{ email: "cam@example.nz", audience: "customer", unsubscribed: false }, { email: "ana@example.nz", audience: "customer", unsubscribed: true }];
    await press();
    const again = await press();
    expect(again.body.newlyUnsubscribed).toBe(0);
    expect((await state())["cam@example.nz|customer"]).toBe(true);
  });

  it("isn't for before the switch", async () => {
    backend = "wix";
    expect((await press()).status).toBe(409);
  });
});
