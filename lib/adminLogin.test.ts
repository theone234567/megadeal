import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { base32Decode, totpCode } from "./totp";

// Admin sign-in with and without two-factor (app/api/admin/login).
const kv = new Map<string, string>();
vi.mock("./adminRateLimit", () => ({
  getClientIp: () => "1.2.3.4",
  checkIpLockout: async () => ({ locked: false }),
  recordFailedIpAttempt: async () => ({ locked: false, remaining: 4 }),
  clearIpAttempts: async () => {},
}));
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v), delete: async () => {} }),
}));
process.env.ADMIN_PASSWORD = "pw-123";
process.env.ADMIN_SESSION_SECRET = "s";
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const { POST } = await import("@/app/api/admin/login/route");
const login = (body: unknown) => POST(new NextRequest("http://x/api/admin/login", { method: "POST", body: JSON.stringify(body) }));
const now = () => totpCode(base32Decode(SECRET)!, Math.floor(Date.now() / 30000));

afterEach(() => {
  delete process.env.ADMIN_TOTP_SECRET;
  kv.clear();
});

describe("admin sign-in", () => {
  it("without ADMIN_TOTP_SECRET: the password alone, as before", async () => {
    const res = await login({ password: "pw-123" });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/admin_session=/);
  });

  it("with it: asks for the code, then accepts the current one once", async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    const first = await login({ password: "pw-123" });
    expect(first.status).toBe(401);
    expect((await first.json()).needsCode).toBe(true);
    expect(first.headers.get("set-cookie")).toBeNull();

    const code = now();
    expect((await login({ password: "pw-123", code })).status).toBe(200);
    expect((await login({ password: "pw-123", code })).status).toBe(401); // same code again
  });

  it("a wrong password never gets as far as the code", async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    const res = await login({ password: "wrong", code: now() });
    expect(res.status).toBe(401);
    expect((await res.json()).needsCode).toBeUndefined();
  });
});
