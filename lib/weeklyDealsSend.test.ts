import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The weekly new-deals email through its real route
 * (app/api/cron/weekly-deals), as the hourly job calls it.
 */

const SITE = "https://megadeal.co.nz";
const kvStore = new Map<string, string>();
const kv = { get: async (k: string) => kvStore.get(k) ?? null, put: async (k: string, v: string) => void kvStore.set(k, v) };
const subscribers = [
  { _id: "s1", email: "aroha@example.nz", audience: "customer", verified: true, unsubscribeToken: "a".repeat(64) },
  { _id: "s2", email: "sam@example.nz", audience: "customer", verified: true, unsubscribeToken: "b".repeat(64) },
  { _id: "s3", email: "left@example.nz", audience: "customer", verified: true, unsubscribed: true },
  { _id: "s4", email: "unconfirmed@example.nz", audience: "customer", verified: false },
  { _id: "s5", email: "cafe@example.nz", audience: "merchant", verified: true, unsubscribeToken: "c".repeat(64) },
];
let deals: Record<string, unknown>[] = [];
const sent: { to: string; subject: string; html: string; unsubscribeUrl?: string }[] = [];

vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("@/lib/siteConfig")>()), SITE_LAUNCHED: true, SITE_URL: SITE }));
vi.mock("@/lib/cronAuth", () => ({ cronCaller: () => "scheduler" }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/rateLimit", () => ({ getRateLimitKv: async () => kv }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => ({ items: { query: () => ({}) } }) }));
vi.mock("@/lib/queryAll", () => ({ queryAllItems: async () => subscribers }));
vi.mock("@/lib/fetchDealServer", () => ({ fetchAllLiveDealsServer: async () => deals }));
vi.mock("@/lib/sendEmail", async (orig) => ({
  ...(await orig<typeof import("@/lib/sendEmail")>()),
  sendEmail: async (m: (typeof sent)[number]) => (sent.push(m), { ok: true as const }),
}));

async function run() {
  const { POST } = await import("@/app/api/cron/weekly-deals/route");
  return (await POST(new NextRequest(`${SITE}/api/cron/weekly-deals`, { method: "POST" }))).json();
}

const newDeal = { name: "Two brunches", slug: "two-brunches", businessName: "Harbour Light", businessSuburb: "Ponsonby", now: 45, was: 68, discountPercent: 34, isFlash: false, startsAt: "2026-10-27T00:00:00Z" };

describe("the weekly deals email", () => {
  afterEach(() => {
    vi.useRealTimers();
    sent.length = 0;
    kvStore.clear();
  });

  it("goes once on Thursday evening to confirmed customer subscribers, each with their own unsubscribe", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-29T05:00:00Z")); // Thursday 6 pm NZ
    deals = [newDeal];
    const first = await run();
    expect(first).toMatchObject({ campaign: "weekly-2026-10-29", sent: 2, remaining: 0 });
    expect(sent.map((m) => m.to).sort()).toEqual(["aroha@example.nz", "sam@example.nz"]);
    expect(sent[0].subject).toBe("New deals in Auckland this week");
    expect(sent[0].html).toContain(`${SITE}/deal/two-brunches`);
    expect(sent.every((m) => m.unsubscribeUrl?.startsWith(`${SITE}/api/email-signup/unsubscribe?token=`))).toBe(true);
    // The next hourly run: nobody gets it twice.
    expect(await run()).toMatchObject({ sent: 0 });
    expect(sent).toHaveLength(2);
  });

  it("isn't sent outside the window or in a week with no new deals", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T05:00:00Z")); // Wednesday
    deals = [newDeal];
    expect(await run()).toEqual({ skipped: "not sending time" });
    vi.setSystemTime(new Date("2026-10-29T05:00:00Z"));
    deals = [{ ...newDeal, startsAt: "2026-10-01T00:00:00Z" }];
    expect(await run()).toEqual({ skipped: "no new deals this week" });
    expect(sent).toHaveLength(0);
  });
});
