import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Admin sign-out (app/api/admin/logout): security pack T164.
const settings = new Map<string, string>();
let revokedBefore: number | null = null;
vi.mock("./securityStore", () => ({
  adminSessionsRevokedBefore: async () => revokedBefore,
  revokeAdminSessionsNow: async () => {
    revokedBefore = Date.now() + 1;
    return true;
  },
  endAdminSession: async (sig: string, expires: number) => {
    settings.set(sig, String(expires));
    return true;
  },
  adminSessionEnded: async (sig: string) => settings.has(sig),
}));
const audit: string[] = [];
vi.mock("./adminAudit", () => ({ logAdminAction: async (e: { action: string }) => void audit.push(e.action) }));
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => null,
  getClientIp: () => "1.2.3.4",
  checkRateLimit: async () => ({ limited: false }),
}));
process.env.ADMIN_SESSION_SECRET = "s";
const { createAdminSessionToken, verifyAdminSessionToken } = await import("./adminSession");
const { POST } = await import("@/app/api/admin/logout/route");
const logout = (token?: string, body?: unknown, origin?: string) =>
  POST(
    new NextRequest("https://megadeal.co.nz/api/admin/logout", {
      method: "POST",
      headers: { ...(token ? { cookie: `admin_session=${token}` } : {}), ...(origin ? { origin } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  settings.clear();
  revokedBefore = null;
  audit.length = 0;
});

describe("admin sign-out", () => {
  it("without an admin session: 401, and every admin session stays signed in", async () => {
    const a = createAdminSessionToken();
    const res = await logout();
    expect(res.status).toBe(401);
    expect(await verifyAdminSessionToken(a)).toBe(true);
    expect(audit).toEqual(["Sign-out refused"]);
    // From another site, with a made-up token, or asking for everywhere: the same.
    expect((await logout("1.2.bad", { everywhere: true }, "https://evil.example")).status).toBe(401);
    expect(await verifyAdminSessionToken(a)).toBe(true);
  });

  it("an admin's own sign-out ends that session only", async () => {
    const mine = createAdminSessionToken();
    await new Promise((r) => setTimeout(r, 2));
    const other = createAdminSessionToken();
    const res = await logout(mine);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/admin_session=;/);
    expect(await verifyAdminSessionToken(mine)).toBe(false);
    expect(await verifyAdminSessionToken(other)).toBe(true);
  });

  it("'everywhere' ends every admin session", async () => {
    const mine = createAdminSessionToken();
    const other = createAdminSessionToken();
    expect((await logout(mine, { everywhere: true })).status).toBe(200);
    expect(await verifyAdminSessionToken(mine)).toBe(false);
    expect(await verifyAdminSessionToken(other)).toBe(false);
  });
});
