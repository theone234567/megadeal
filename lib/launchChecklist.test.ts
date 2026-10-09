import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildChecklist, isManualItem, looksLikeTest, MANUAL_ITEMS, type LaunchFacts } from "./launchChecklist";

/** Admin > Launch checklist (lib/launchChecklist.ts, app/api/admin/launch-checklist). */

const facts = (over: Partial<LaunchFacts> = {}): LaunchFacts => ({
  launched: false,
  offWix: { allOn: true, problem: null },
  backup: { ok: true, detail: "Latest copy taken 3 hours ago (13 KB)." },
  accountEmails: { problem: null, lastSentAt: "2026-10-09T01:00:00Z" },
  turnstile: true,
  twoFactor: false,
  aiReview: false,
  notifyEmail: true,
  withoutLogin: 0,
  testBusinesses: [],
  approvedBusinesses: 6,
  draftDeals: 3,
  liveDeals: 0,
  verifiedSubscribers: 3,
  ticks: {},
  ...over,
});
const item = (f: LaunchFacts, id: string) => buildChecklist(f).flatMap((s) => s.items).find((i) => i.id === id)!;

describe("the launch checklist", () => {
  it("ticks what the site can check for itself", () => {
    expect(item(facts(), "off-wix").state).toBe("done");
    expect(item(facts({ offWix: { allOn: false, problem: "Business logins: Robot check." } }), "off-wix")).toMatchObject({ state: "todo", detail: expect.stringMatching(/Robot check/) });
    expect(item(facts({ offWix: null }), "off-wix").state).toBe("warning");
    expect(item(facts({ withoutLogin: 4 }), "existing-businesses")).toMatchObject({ state: "todo", detail: expect.stringMatching(/4 businesses have no password/) });
    expect(item(facts({ accountEmails: { problem: null, lastSentAt: null } }), "account-emails").state).toBe("todo");
    expect(item(facts({ accountEmails: { problem: "couldn't be sent", lastSentAt: "2026-10-09T01:00:00Z" } }), "account-emails").state).toBe("warning");
    expect(item(facts(), "two-factor").state).toBe("warning");
    expect(item(facts(), "launched").state).toBe("todo");
    expect(item(facts({ launched: true }), "launched").state).toBe("done");
  });

  it("names the businesses that look like tests, and links to the first", () => {
    const t = item(facts({ testBusinesses: [{ id: "a1", name: "test 3", email: "owner+test3@x.nz" }] }), "test-businesses");
    expect(t).toMatchObject({ state: "todo", link: { href: "/admin/businesses/a1" } });
    expect(t.detail).toMatch(/test 3/);
  });

  it("keeps hand ticks, and only for the items meant to be ticked by hand", () => {
    expect(item(facts({ ticks: { dmarc: "2026-10-09T02:00:00Z" } }), "dmarc")).toMatchObject({ state: "done", manual: true, tickedAt: "2026-10-09T02:00:00Z" });
    expect(item(facts(), "dmarc").state).toBe("todo");
    expect(isManualItem("dmarc")).toBe(true);
    expect(isManualItem("off-wix")).toBe(false);
    expect(isManualItem("__proto__")).toBe(false);
    for (const id of MANUAL_ITEMS) expect(buildChecklist(facts()).flatMap((s) => s.items).some((i) => i.id === id && i.manual)).toBe(true);
  });

  it("spots test businesses by name or email, not real ones", () => {
    expect(looksLikeTest("test 3", "someone+test3@example.nz")).toBe(true);
    expect(looksLikeTest("Browser Bistro", "browser+1@bistro.test")).toBe(true);
    expect(looksLikeTest("Testarossa Cafe", "hello@testarossa.co.nz")).toBe(false);
    expect(looksLikeTest("Harbour Bistro", "owner@harbourbistro.co.nz")).toBe(false);
  });
});

const kv = new Map<string, string>();
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v) }),
}));

describe("ticking by hand", () => {
  const post = async (body: unknown, origin = "https://megadeal.co.nz") => {
    const { POST } = await import("@/app/api/admin/launch-checklist/route");
    return POST(new NextRequest("https://megadeal.co.nz/api/admin/launch-checklist", { method: "POST", headers: { origin }, body: JSON.stringify(body) }));
  };
  it("saves a tick and takes it away again; refuses other sites and unknown items", async () => {
    expect((await post({ id: "dmarc", done: true })).status).toBe(200);
    expect(JSON.parse(kv.get("launch:checklist:ticks")!)).toHaveProperty("dmarc");
    expect((await post({ id: "dmarc", done: false })).status).toBe(200);
    expect(JSON.parse(kv.get("launch:checklist:ticks")!)).not.toHaveProperty("dmarc");
    expect((await post({ id: "launched", done: true })).status).toBe(400);
    expect((await post({ id: "dmarc", done: true }, "https://evil.example")).status).toBe(403);
  });
});
