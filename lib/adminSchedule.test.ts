import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Admin rescheduling and approval of scheduled deals
// (app/api/admin/deals/[id]/route.ts) against a fake Wix.
let row: Record<string, any> = {};
const update = vi.fn(async (_c: string, item: Record<string, any>) => item);
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./wixAdmin", () => ({ createWixAdminClient: () => ({ items: { get: async () => row, update } }) }));
vi.mock("./merchantActivity", () => ({ logMerchantActivity: vi.fn() }));
vi.mock("./indexNowDeal", () => ({ notifyDealChanged: vi.fn() }));

const { PATCH } = await import("@/app/api/admin/deals/[id]/route");
const call = (body: unknown) =>
  PATCH(new NextRequest("http://x/api/admin/deals/d1", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "d1" }) });

const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const nzParts = (ms: number) => {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};

beforeEach(() => update.mockClear());

describe("admin and scheduled deals", () => {
  it("won't approve a deal whose start passed, until it has a new one", async () => {
    row = { _id: "d1", status: "Pending Approval", isFlash: true, requestedDurationMinutes: 60, scheduledStartAt: iso(Date.now() - 2 * HOUR) };
    const refused = await call({ status: "Live" });
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toMatch(/needs a new start time/);

    // New start and approval in the same save: the new times are used.
    const start = Math.ceil((Date.now() + 3 * HOUR) / 60_000) * 60_000;
    const ok = await call({ status: "Live", scheduledStart: nzParts(start) });
    expect(ok.status).toBe(200);
    const saved = update.mock.calls.at(-1)![1];
    expect(saved).toMatchObject({ status: "Live", scheduledStartAt: iso(start), firstPublishedAt: iso(start), expiresAt: iso(start + HOUR) });
  });

  it("moves an approved deal that hasn't started, keeping its run", async () => {
    const oldStart = Date.now() + 5 * HOUR;
    row = { _id: "d1", status: "Live", everLive: true, isFlash: true, scheduledStartAt: iso(oldStart), firstPublishedAt: iso(oldStart), expiresAt: iso(oldStart + 2 * HOUR) };
    const start = Math.ceil((Date.now() + 24 * HOUR) / 60_000) * 60_000;
    expect((await call({ scheduledStart: nzParts(start) })).status).toBe(200);
    expect(update.mock.calls.at(-1)![1]).toMatchObject({ firstPublishedAt: iso(start), expiresAt: iso(start + 2 * HOUR) });
  });

  it("can't change the start of a deal that's already showing", async () => {
    const started = Date.now() - HOUR;
    row = { _id: "d1", status: "Live", everLive: true, scheduledStartAt: iso(started), firstPublishedAt: iso(started), expiresAt: iso(started + 5 * HOUR) };
    expect((await call({ scheduledStart: null })).status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });
});
