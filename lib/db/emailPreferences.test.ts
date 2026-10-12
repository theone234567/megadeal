import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { createPgAdminClient } from "./wixShim";
import type { Sql } from "./connection";

/** Portal > Emails from MegaDeal, end to end on the new database. */

let pglite: PGlite;
let db: Sql;
const kv = new Map<string, string>();
const member = { id: "00000001-0000-4000-8000-000000000000", email: "owner@harbourbistro.co.nz", loginEmailVerified: true, nickname: null };

vi.mock("@/lib/memberAuth", () => ({ getVerifiedMember: async () => member }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => createPgAdminClient((fn) => fn(db)) }));
vi.mock("@/lib/db/connection", async (orig) => ({ ...(await orig<typeof import("./connection")>()), withDb: (fn: (d: Sql) => unknown) => fn(db) }));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async () => ({ ok: true }) }));
vi.mock("@/lib/metaCapi", () => ({ sendMetaCapiEvent: async () => {} }));
vi.mock("@/lib/rateLimit", async (orig) => ({
  ...(await orig<typeof import("../rateLimit")>()),
  checkRateLimit: async () => ({ limited: false }),
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  await db.query("insert into auth.users (id) values ($1)", [member.id]);
  vi.spyOn(console, "error").mockImplementation(() => {});
  // A business that signed up without ticking "business news".
  const apply = await import("@/app/api/merchants/apply/route");
  const res = await apply.POST(
    new NextRequest("https://megadeal.co.nz/api/merchants/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName: "Harbour Bistro", contactName: "Sam", agreedToTerms: true }),
    }),
  );
  expect(res.status).toBe(200);
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});

async function prefs(body?: unknown) {
  const route = await import("@/app/api/merchants/email-preferences/route");
  const url = "https://megadeal.co.nz/api/merchants/email-preferences";
  const res = body
    ? await route.POST(new NextRequest(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))
    : await route.GET(new NextRequest(url));
  return { status: res.status, body: await res.json() };
}

describe("a business's email choices", () => {
  it("start with news off (no tick at sign-up) and announcements on", async () => {
    expect((await prefs()).body).toEqual({ news: false, announcements: true });
  });

  it("can join the news list, and leave it again", async () => {
    expect((await prefs({ news: true })).body.news).toBe(true);
    expect(await db.query("select verified, unsubscribed from public.email_signups where audience = 'merchant'")).toEqual([
      { verified: true, unsubscribed: false },
    ]);
    expect((await prefs({ news: false })).body.news).toBe(false);
    expect((await db.query<{ unsubscribed: boolean }>("select unsubscribed from public.email_signups"))[0].unsubscribed).toBe(true);
    expect((await prefs({ news: true })).body.news).toBe(true);
  });

  it("can turn announcements and reminders off and on, the same switch the email links use", async () => {
    expect((await prefs({ announcements: false })).body.announcements).toBe(false);
    expect([...kv.keys()].some((k) => k.startsWith("biz-email-opt-out:"))).toBe(true);
    expect((await prefs({ announcements: true })).body.announcements).toBe(true);
    expect([...kv.keys()].some((k) => k.startsWith("biz-email-opt-out:"))).toBe(false);
  });

  it("refuses anything but a yes or no", async () => {
    expect((await prefs({ news: "yes" })).status).toBe(400);
  });
});
