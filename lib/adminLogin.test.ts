import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { base32Decode, totpCode } from "./totp";
import { ADMIN_GLOBAL_MAX_FAILURES } from "./adminSignIn";

// Admin sign-in (app/api/admin/login): two-factor, failing closed on the
// live site (security pack T152).
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
// The database side, in memory.
const steps = new Set<number>();
const failures = new Map<string, number>();
const locks = new Map<string, number>();
vi.mock("./securityStore", () => ({
  claimTotpStep: async (step: number) => (steps.has(step) ? false : (steps.add(step), true)),
  adminLockSecondsLeft: async (key: string) => Math.max(0, Math.ceil(((locks.get(key) ?? 0) - Date.now()) / 1000)),
  recordAdminFailure: async (key: string, max: number, _w: number, lockSeconds: number) => {
    const count = (failures.get(key) ?? 0) + 1;
    failures.set(key, count);
    if (count < max) return { count, locked: false };
    locks.set(key, Date.now() + lockSeconds * 1000);
    failures.delete(key);
    return { count, locked: true };
  },
}));
const sent: string[] = [];
vi.mock("./sendEmail", () => ({ sendTransactionalEmail: async (m: { subject: string }) => (sent.push(m.subject), true) }));
vi.mock("./adminAudit", () => ({ logAdminAction: async () => {} }));
process.env.ADMIN_PASSWORD = "pw-123";
process.env.ADMIN_SESSION_SECRET = "s";
process.env.TURNSTILE_DISABLED = "1";
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const { GET, POST } = await import("@/app/api/admin/login/route");
const login = (body: unknown) => POST(new NextRequest("http://x/api/admin/login", { method: "POST", body: JSON.stringify(body) }));
const now = () => totpCode(base32Decode(SECRET)!, Math.floor(Date.now() / 30000));

afterEach(() => {
  delete process.env.ADMIN_TOTP_SECRET;
  delete process.env.ADMIN_REQUIRE_TOTP;
  delete process.env.ADMIN_NOTIFY_EMAIL;
  kv.clear();
  steps.clear();
  failures.clear();
  locks.clear();
  sent.length = 0;
});

describe("admin sign-in", () => {
  it("without ADMIN_TOTP_SECRET (and not required): the password alone", async () => {
    expect((await (await GET()).json()).mode).toBe("password");
    const res = await login({ password: "pw-123" });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/admin_session=/);
  });

  it("with ADMIN_REQUIRE_TOTP but no ADMIN_TOTP_SECRET: refused, even with the right password", async () => {
    process.env.ADMIN_REQUIRE_TOTP = "true";
    expect((await (await GET()).json()).mode).toBe("setup-needed");
    const res = await login({ password: "pw-123" });
    expect(res.status).toBe(503);
    expect((await res.json()).setupNeeded).toBe(true);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("with it: the password and the current code together, the code once", async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    expect((await (await GET()).json()).mode).toBe("password-and-code");
    const code = now();
    const ok = await login({ password: "pw-123", code });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toMatch(/admin_session=/);
    expect((await login({ password: "pw-123", code })).status).toBe(401); // same code again
  });

  it("a right password without a code gets the same answer as a wrong one, and counts as a failure", async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    const right = await login({ password: "pw-123" });
    const wrong = await login({ password: "nope" });
    expect(right.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await right.json()).toEqual(await wrong.json());
    expect(right.headers.get("set-cookie")).toBeNull();
    expect(failures.get("all-addresses")).toBe(2);
  });

  it("a wrong password doesn't use up the current code", async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    const code = now();
    expect((await login({ password: "wrong", code })).status).toBe(401);
    expect((await login({ password: "pw-123", code })).status).toBe(200);
  });

  it(`after ${ADMIN_GLOBAL_MAX_FAILURES} failures from anywhere, sign-in pauses for everyone and the owner is told once`, async () => {
    process.env.ADMIN_TOTP_SECRET = SECRET;
    process.env.ADMIN_NOTIFY_EMAIL = "owner@megadeal.invalid";
    for (let i = 0; i < ADMIN_GLOBAL_MAX_FAILURES; i++) await login({ password: `guess-${i}` });
    const res = await login({ password: "pw-123", code: now() });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/paused/);
    expect(sent).toEqual(["MegaDeal admin sign-in paused after many failed attempts"]);
  });
});
