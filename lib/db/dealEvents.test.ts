import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./connection";
import { createTestDb } from "./testDb";
import { dealStats, deviceClass, looksLikeBot, parseIncomingEvent, recordDealEvents, type IncomingEvent } from "../dealEventLog";

/**
 * What customers do with deals (20261021000000_deal_events.sql,
 * lib/dealEventLog.ts): checked on the way in, stored once, always filed
 * against the deal's own business, and reported per business only.
 */

let db: PGlite;
let sql: Sql;
let bistro: string;
let spa: string;
let dinner: string;
let facial: string;
let testDeal: string;
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

beforeAll(async () => {
  const t = await createTestDb();
  db = t.db;
  sql = { query: async (text, params) => (await db.query(text, params as any[])).rows as any[] };
  bistro = await t.insert("merchants", { email: "owner@bistro.nz", business_name: "Bistro", status: "Approved" });
  spa = await t.insert("merchants", { email: "owner@spa.nz", business_name: "Day Spa", status: "Approved" });
  dinner = await t.insert("deals", { merchant_id: bistro, name: "Two-course dinner", price_now: 49, price_was: 80, category_slug: "food-drink", status: "Live" });
  facial = await t.insert("deals", { merchant_id: spa, name: "Facial", price_now: 59, price_was: 99, category_slug: "beauty-spa", status: "Live" });
  testDeal = await t.insert("deals", { merchant_id: bistro, name: "Admin test", price_now: 1, price_was: 2, category_slug: "food-drink", status: "Live", is_test: true });
}, 60_000);
afterAll(async () => {
  await db?.close();
});

const ev = (p: Partial<IncomingEvent> & Pick<IncomingEvent, "event">): IncomingEvent => ({
  eventId: uuid(),
  dealId: dinner,
  businessSlug: null,
  sessionId: "visit-aaaaaaaa",
  source: null,
  method: null,
  referrerHost: null,
  utm: { source: null, medium: null, campaign: null },
  ...p,
});

describe("checking events from the browser", () => {
  it("takes only known events with proper ids", () => {
    expect(parseIncomingEvent({ event: "deal_view", eventId: uuid(), dealId: uuid() })).not.toBeNull();
    expect(parseIncomingEvent({ event: "purchase", eventId: uuid(), dealId: uuid() })).toBeNull();
    expect(parseIncomingEvent({ event: "deal_view", eventId: "1", dealId: uuid() })).toBeNull();
    expect(parseIncomingEvent({ event: "deal_view", eventId: uuid() })).toBeNull();
    expect(parseIncomingEvent({ event: "deal_contact_click", eventId: uuid(), dealId: uuid() })).toBeNull();
  });

  it("keeps nothing that could identify someone", () => {
    const e = parseIncomingEvent({
      event: "deal_view",
      eventId: uuid(),
      dealId: uuid(),
      referrerHost: "https://www.google.com/search?q=jane+doe",
      utmSource: "jane@example.com",
      utmCampaign: "spring sale",
      code: "FEASTKT",
      phone: "021 555 1234",
    })!;
    expect(e.referrerHost).toBeNull();
    expect(e.utm).toEqual({ source: null, medium: null, campaign: "spring sale" });
    expect(Object.keys(e)).not.toContain("code");
    expect(parseIncomingEvent({ event: "deal_view", eventId: uuid(), dealId: uuid(), referrerHost: "www.Google.com" })!.referrerHost).toBe("google.com");
  });

  it("knows phones from computers, and leaves crawlers out", () => {
    expect(deviceClass("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
    expect(deviceClass("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceClass("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe("desktop");
    expect(looksLikeBot("Googlebot/2.1")).toBe(true);
    expect(looksLikeBot(null)).toBe(true);
    expect(looksLikeBot("Mozilla/5.0 (iPhone) Safari")).toBe(false);
  });
});

describe("storing events", () => {
  it("stores each action once, however many times it's sent", async () => {
    const e = ev({ event: "deal_view" });
    expect(await recordDealEvents(sql, [e, e], "mobile")).toBe(1);
    expect(await recordDealEvents(sql, [e], "mobile")).toBe(0);
  });

  it("files events against the deal's own business, never one the browser names", async () => {
    // The spa's slug sent with the bistro's deal: refused outright.
    const [{ slug }] = await sql.query<{ slug: string }>("select slug from public.merchants where id = $1", [spa]);
    expect(await recordDealEvents(sql, [ev({ event: "deal_view", businessSlug: slug })], "desktop")).toBe(0);
    await recordDealEvents(sql, [ev({ event: "deal_view", dealId: facial })], "desktop");
    const rows = await sql.query<{ merchant_id: string }>("select merchant_id from public.deal_events where deal_id = $1", [facial]);
    expect(rows.map((r) => r.merchant_id)).toEqual([spa]);
  });

  it("leaves out test deals, deals that aren't live and unknown deals", async () => {
    await db.query("update public.deals set status = 'Pending Approval' where id = $1", [facial]);
    expect(await recordDealEvents(sql, [ev({ event: "deal_view", dealId: facial })], "mobile")).toBe(0);
    await db.query("update public.deals set status = 'Live' where id = $1", [facial]);
    expect(await recordDealEvents(sql, [ev({ event: "deal_view", dealId: testDeal })], "mobile")).toBe(0);
    expect(await recordDealEvents(sql, [ev({ event: "deal_view", dealId: uuid() })], "mobile")).toBe(0);
  });
});

describe("a business's figures", () => {
  it("count visits and taps separately, and only its own", async () => {
    await db.query("delete from public.deal_events");
    const a = "visit-aaaaaaaa";
    const b = "visit-bbbbbbbb";
    await recordDealEvents(
      sql,
      [
        ev({ event: "deal_view", sessionId: a }),
        ev({ event: "deal_view", sessionId: a }),
        ev({ event: "deal_view", sessionId: b }),
        ev({ event: "deal_code_click", sessionId: a, source: "main" }),
        ev({ event: "deal_code_reveal", sessionId: a, source: "code_panel" }),
        // Opened again in the same visit: two reveals, one visit.
        ev({ event: "deal_code_reveal", sessionId: a, source: "code_panel" }),
        ev({ event: "deal_code_click", sessionId: b, source: "sticky" }),
        ev({ event: "deal_contact_click", sessionId: a, source: "code_panel", method: "phone" }),
        ev({ event: "deal_contact_click", sessionId: a, source: "code_panel", method: "phone" }),
        ev({ event: "deal_code_copy", sessionId: a, source: "code_panel" }),
        ev({ event: "deal_view", sessionId: a, dealId: facial }),
      ],
      "mobile",
    );
    const s = await dealStats(sql, bistro, 30);
    expect(s.totals).toMatchObject({ views: 3, viewSessions: 2, reveals: 2, revealSessions: 1, contactClicks: 2, copies: 1, codeClicks: 2 });
    // One of the two visits that viewed the deal revealed its code.
    expect(s.totals.revealRate).toBe(0.5);
    expect(s.byMethod.phone).toBe(2);
    expect(s.bySource).toEqual({ main: 1, sticky: 1 });
    expect(s.deals.map((d) => d.name)).toEqual(["Two-course dinner"]);
    // The spa sees only its own view.
    expect((await dealStats(sql, spa, 30)).totals.views).toBe(1);
    // MegaDeal sees both.
    expect((await dealStats(sql, null, 30)).totals.views).toBe(4);
  });
});
