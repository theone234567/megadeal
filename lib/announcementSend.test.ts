import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Sending an announcement through the real route (app/api/admin/announcement),
 * driven the way the admin panel drives it: batch after batch until none
 * are left. Addresses that fail are passed over for an hour, then retried.
 */

const SITE = "https://megadeal.co.nz";
const kvStore = new Map<string, string>();
const kv = { get: async (k: string) => kvStore.get(k) ?? null, put: async (k: string, v: string) => void kvStore.set(k, v) };

// 25 addresses that can never be sent to, ahead of 20 that can.
const BAD = Array.from({ length: 25 }, (_, i) => `bad${i}@example.nz`);
const GOOD = Array.from({ length: 20 }, (_, i) => `good${i}@example.nz`);
const rows = [...BAD, ...GOOD].map((email, i) => ({ _id: `m${i}`, email, status: "Approved", businessName: `Biz ${i}` }));
const sentTo: string[] = [];
let down = false;

vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("@/lib/siteConfig")>()), SITE_LAUNCHED: true, SITE_URL: SITE }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("@/lib/authSession", () => ({ fromOwnSite: () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/rateLimit", () => ({ getRateLimitKv: async () => kv }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => ({ items: { query: () => ({ eq: () => ({}) }) } }) }));
vi.mock("@/lib/queryAll", () => ({ queryAllItems: async () => rows }));
vi.mock("@/lib/fetchDealServer", () => ({ fetchAllLiveDealsServer: async () => [] }));
vi.mock("@/lib/sendEmail", () => ({
  sendTransactionalEmail: async ({ to }: { to: string }) => {
    if (down || to.startsWith("bad")) return false;
    sentTo.push(to);
    return true;
  },
}));

async function send() {
  const { POST } = await import("@/app/api/admin/announcement/route");
  const req = new NextRequest(`${SITE}/api/admin/announcement`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE },
    body: JSON.stringify({ action: "send", audience: "businesses", campaign: "launch", subject: "Hi", body: "We're live." }),
  });
  return (await POST(req)).json() as Promise<{ sent: number; failed: number; waiting: number; remaining: number }>;
}

/** The admin panel's loop (components/admin/AnnouncementPanel.tsx). */
async function sendAll() {
  let sent = 0;
  let empty = 0;
  for (let i = 0; i < 50; i++) {
    const data = await send();
    sent += data.sent;
    empty = data.sent === 0 ? empty + 1 : 0;
    if (data.remaining === 0 || empty >= 2) return { sent, waiting: data.waiting, remaining: data.remaining };
  }
  throw new Error("didn't finish");
}

describe("sending an announcement", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("addresses that fail don't hold up everyone after them", async () => {
    // The first batch is all bad addresses; the run carries on past them.
    const run = await sendAll();
    expect(run).toEqual({ sent: 20, waiting: 25, remaining: 0 });
    expect([...sentTo].sort()).toEqual([...GOOD].sort());
  });

  it("nobody is sent it twice, however often Send is pressed", async () => {
    const again = await sendAll();
    expect(again.sent).toBe(0);
    expect(sentTo).toHaveLength(20);
  });

  it("stops after two empty batches when sending is down, and picks up later", async () => {
    kvStore.clear();
    sentTo.length = 0;
    down = true;
    const run = await sendAll();
    expect(run).toEqual({ sent: 0, waiting: 40, remaining: 5 });

    // Back up: the 5 untried go now; the 40 that failed wait an hour…
    down = false;
    expect(await sendAll()).toEqual({ sent: 5, waiting: 40, remaining: 0 });
    // …then are tried again.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 61 * 60 * 1000);
    expect(await sendAll()).toEqual({ sent: 15, waiting: 25, remaining: 0 });
    expect(new Set(sentTo).size).toBe(20);
    expect(sentTo).toHaveLength(20);
  });
});
