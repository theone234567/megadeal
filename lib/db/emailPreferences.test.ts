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
  // A business that has just signed up.
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

describe("a business's one email choice (owner's decision, 25 Oct 2026)", () => {
  it("starts subscribed: no box to tick at sign-up, the Terms say so", async () => {
    expect((await prefs()).body).toEqual({ subscribed: true });
    expect(await db.query("select count(*)::int as n from public.email_signups")).toEqual([{ n: 0 }]);
  });

  it("turns off and on in one go, the same switch the email links use", async () => {
    expect((await prefs({ subscribed: false })).body).toEqual({ subscribed: false });
    expect([...kv.keys()].some((k) => k.startsWith("biz-email-opt-out:"))).toBe(true);
    expect((await prefs({ subscribed: true })).body).toEqual({ subscribed: true });
    expect([...kv.keys()].some((k) => k.startsWith("biz-email-opt-out:"))).toBe(false);
  });

  it("on the business news list too: off there means off, and back on turns both on", async () => {
    await db.query(
      "insert into public.email_signups (email, audience, source, verified, unsubscribed) values ('owner@harbourbistro.co.nz', 'merchant', 'waitlist', true, true)",
    );
    expect((await prefs()).body).toEqual({ subscribed: false });
    expect((await prefs({ subscribed: true })).body).toEqual({ subscribed: true });
    expect(await db.query("select unsubscribed from public.email_signups")).toEqual([{ unsubscribed: false }]);
    expect((await prefs({ subscribed: false })).body).toEqual({ subscribed: false });
    expect(await db.query("select unsubscribed from public.email_signups")).toEqual([{ unsubscribed: true }]);
  });

  it("the unsubscribe link in a business email turns the one choice off, news list included", async () => {
    await prefs({ subscribed: true });
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret");
    const [{ id }] = await db.query<{ id: string }>("select id::text from public.merchants");
    const { businessOptOutLinks } = await import("@/lib/businessEmailOptOut");
    const link = new URL(businessOptOutLinks("https://megadeal.co.nz", id)!.oneClick);
    const stop = await import("@/app/api/business-emails/stop/route");
    expect((await stop.POST(new NextRequest(link, { method: "POST" }))).status).toBe(200);
    expect((await prefs()).body).toEqual({ subscribed: false });
    expect(await db.query("select unsubscribed from public.email_signups")).toEqual([{ unsubscribed: true }]);
    vi.unstubAllEnvs();
  });

  it("unsubscribing from the business news list also turns the business's choice off", async () => {
    await prefs({ subscribed: true });
    const { unsubscribeEmailSignupByToken } = await import("@/lib/emailSignups");
    const [row] = await createPgAdminClient((fn) => fn(db)).items.query("EmailSignups").find().then((r: any) => r.items);
    expect(await unsubscribeEmailSignupByToken(row.unsubscribeToken)).toBe(true);
    expect((await prefs()).body).toEqual({ subscribed: false });
  });

  it("refuses anything but a yes or no", async () => {
    expect((await prefs({ subscribed: "yes" })).status).toBe(400);
    expect((await prefs({ news: true })).status).toBe(400);
  });
});
