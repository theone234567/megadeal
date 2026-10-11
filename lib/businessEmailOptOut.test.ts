import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.ADMIN_SESSION_SECRET = "test-secret-for-vitest";
const kv = new Map<string, string>();
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({
    get: async (k: string) => kv.get(k) ?? null,
    put: async (k: string, v: string) => void kv.set(k, v),
    delete: async (k: string) => void kv.delete(k),
  }),
}));

const optOut = await import("./businessEmailOptOut");
const { POST } = await import("@/app/api/business-emails/stop/route");
const SITE = "https://megadeal.co.nz";
const ID = "3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b";
const OTHER = "11111111-2222-4333-8444-555555555555";

beforeEach(() => kv.clear());

describe("unsubscribing from business emails", () => {
  it("only accepts a link MegaDeal signed for that business", () => {
    const links = optOut.businessOptOutLinks(SITE, ID)!;
    const s = new URL(links.page).searchParams.get("s")!;
    expect(optOut.validBusinessOptOut(ID, s)).toBe(true);
    expect(optOut.validBusinessOptOut(OTHER, s)).toBe(false); // someone else's business
    expect(optOut.validBusinessOptOut(ID, s.replace(/.$/, s.endsWith("0") ? "1" : "0"))).toBe(false); // tampered
    expect(optOut.validBusinessOptOut(ID, "")).toBe(false);
    expect(optOut.validBusinessOptOut("not-an-id", s)).toBe(false);
  });

  it("never puts the email address in the link", () => {
    const links = optOut.businessOptOutLinks(SITE, ID)!;
    expect(links.page).not.toContain("@");
    expect(links.oneClick).not.toContain("@");
  });

  it("a mail app's one-click unsubscribe works, and a forged one does nothing", async () => {
    const one = optOut.businessOptOutLinks(SITE, ID)!.oneClick;
    expect((await POST(new NextRequest(one, { method: "POST" }))).status).toBe(200);
    expect(await optOut.optedOutBusinesses([ID, OTHER])).toEqual(new Set([ID]));

    const forged = one.replace(ID, OTHER);
    expect((await POST(new NextRequest(forged, { method: "POST" }))).status).toBe(400);
    expect((await optOut.optedOutBusinesses([OTHER])).size).toBe(0);
  });

  it("the button on /stop-emails unsubscribes and says so", async () => {
    const page = new URL(optOut.businessOptOutLinks(SITE, ID)!.page);
    const form = new FormData();
    form.set("m", page.searchParams.get("m")!);
    form.set("s", page.searchParams.get("s")!);
    const res = await POST(new NextRequest(`${SITE}/api/business-emails/stop`, { method: "POST", body: form }));
    expect(res.headers.get("location")).toMatch(/\/stop-emails\?done=1$/);
    expect((await optOut.optedOutBusinesses([ID])).has(ID)).toBe(true);

    const bad = new FormData();
    bad.set("m", ID);
    bad.set("s", "0".repeat(32));
    kv.clear();
    const refused = await POST(new NextRequest(`${SITE}/api/business-emails/stop`, { method: "POST", body: bad }));
    expect(refused.headers.get("location")).toMatch(/done=0$/);
    expect((await optOut.optedOutBusinesses([ID])).size).toBe(0);
  });

  it("gives no link without the server's secret", () => {
    const saved = process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_SESSION_SECRET;
    expect(optOut.businessOptOutLinks(SITE, ID)).toBeNull();
    expect(optOut.validBusinessOptOut(ID, "a".repeat(32))).toBe(false);
    process.env.ADMIN_SESSION_SECRET = saved;
  });
});
