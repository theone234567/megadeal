import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Sending an announcement through the real route (app/api/admin/announcement),
 * driven the way the admin panel drives it: batch after batch until none
 * are left. Addresses that fail are passed over for an hour, then retried.
 */

const SITE = "https://megadeal.co.nz";
const kvStore = new Map<string, string>();
// Cloudflare forgets a key once its expirationTtl is up.
const kvExpires = new Map<string, number>();
const kv = {
  get: async (k: string) => ((kvExpires.get(k) ?? Infinity) > Date.now() ? (kvStore.get(k) ?? null) : null),
  put: async (k: string, v: string, o?: { expirationTtl?: number }) => {
    kvStore.set(k, v);
    if (o?.expirationTtl) kvExpires.set(k, Date.now() + o.expirationTtl * 1000);
  },
};

// 25 addresses that can never be sent to, ahead of 20 that can.
const BAD = Array.from({ length: 25 }, (_, i) => `bad${i}@example.nz`);
const GOOD = Array.from({ length: 20 }, (_, i) => `good${i}@example.nz`);
process.env.ADMIN_SESSION_SECRET = "test-secret-for-vitest";
const rows = [...BAD, ...GOOD].map((email, i) => ({
  _id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  email,
  status: "Approved",
  businessName: `Biz ${i}`,
}));
const unsubHeaders: (string | undefined)[] = [];
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
let quotaAfter = Infinity;
// Resend's free plan: how many emails it had counted today before this run
// (undefined: a paid plan, which reports no daily count).
let usedBefore: number | undefined;
vi.mock("@/lib/sendEmail", async (orig) => {
  const sendEmail = async ({ to, unsubscribeUrl }: { to: string; unsubscribeUrl?: string }) => {
    if (sentTo.length >= quotaAfter) return { ok: false as const, reason: "quota" as const };
    if (down || to.startsWith("bad")) return { ok: false as const };
    sentTo.push(to);
    unsubHeaders.push(unsubscribeUrl);
    return usedBefore === undefined ? { ok: true as const } : { ok: true as const, dailyUsed: usedBefore + sentTo.length };
  };
  return { ...(await orig<typeof import("@/lib/sendEmail")>()), sendEmail, sendTransactionalEmail: async (m: { to: string }) => (await sendEmail(m)).ok };
});

async function send() {
  const { POST } = await import("@/app/api/admin/announcement/route");
  const req = new NextRequest(`${SITE}/api/admin/announcement`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: SITE },
    body: JSON.stringify({ action: "send", audience: "businesses", campaign: "launch", subject: "Hi", body: "We're live." }),
  });
  return (await POST(req)).json() as Promise<{ sent: number; failed: number; waiting: number; remaining: number; quotaReached: boolean }>;
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
    kvExpires.clear();
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

  it("stops at Resend's sending limit without counting it against anyone", async () => {
    kvStore.clear();
    kvExpires.clear();
    sentTo.length = 0;
    quotaAfter = 7;
    let run = { sent: 0, failed: 0, quotaReached: false };
    for (let i = 0; i < 10 && !run.quotaReached; i++) {
      const data = await send();
      run = { sent: run.sent + data.sent, failed: run.failed + data.failed, quotaReached: data.quotaReached };
    }
    // The 25 bad addresses failed on their own; the limit stopped it at 7.
    expect(run).toEqual({ sent: 7, failed: 25, quotaReached: true });

    // Later the same day nothing more is tried, not even one email to find
    // out (the weekly deals email runs every hour).
    quotaAfter = Infinity;
    expect(await send()).toMatchObject({ sent: 0, failed: 0, quotaReached: true });
    expect(sentTo).toHaveLength(7);

    // The next day: carries on where it stopped, nobody twice.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 13 * 60 * 60 * 1000);
    let sent = 0;
    for (let i = 0; i < 10; i++) {
      const data = await send();
      sent += data.sent;
      if (data.remaining === 0) break;
    }
    expect(sent).toBe(13);
    expect(sentTo).toHaveLength(20);
    expect(new Set(sentTo).size).toBe(20);
  });

  it("on Resend's free plan, stops at 75 emails a day so sign-up codes can still go out", async () => {
    kvStore.clear();
    kvExpires.clear();
    sentTo.length = 0;
    // 70 already sent today (codes, alerts, an earlier batch).
    usedBefore = 70;
    let run = { sent: 0, quotaReached: false };
    for (let i = 0; i < 10 && !run.quotaReached; i++) {
      const data = await send();
      run = { sent: run.sent + data.sent, quotaReached: data.quotaReached };
    }
    expect(run).toEqual({ sent: 5, quotaReached: true });
    // Paused for the rest of the day.
    expect(await send()).toMatchObject({ sent: 0, quotaReached: true });

    // A paid plan reports no daily count: everyone, in one go.
    kvStore.clear();
    kvExpires.clear();
    sentTo.length = 0;
    usedBefore = undefined;
    expect((await sendAll()).sent).toBe(20);
  });

  it("every business email carries its signed one-click unsubscribe", () => {
    expect(unsubHeaders.length).toBeGreaterThan(0);
    for (const u of unsubHeaders) expect(u).toMatch(/^https:\/\/[^/]+\/api\/business-emails\/stop\?m=[0-9a-f-]{36}&s=[0-9a-f]{32}$/);
  });
});
