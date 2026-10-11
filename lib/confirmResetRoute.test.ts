import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Security audit of 10 Oct 2026, finding 6: the reset-confirm route. */

const calls = { breach: 0, consume: 0, restore: 0, revoke: 0 };
let setResult: { ok: boolean; code?: string; data?: { id?: string } } = { ok: true, data: { id: "u1" } };

vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }), getClientIp: () => "1.2.3.4" }));
vi.mock("@/lib/pwnedPassword", () => ({
  BREACHED_PASSWORD_MESSAGE: "breached",
  passwordSeenInBreaches: async () => (calls.breach++, false),
}));
vi.mock("@/lib/passwordResetTokens", () => ({
  consumePasswordResetToken: async () => (calls.consume++, { email: "owner@example.com", expiresAt: new Date(Date.now() + 60_000) }),
  restorePasswordResetToken: async () => void calls.restore++,
  revokePasswordResetTokens: async () => void calls.revoke++,
}));
vi.mock("@/lib/authSession", () => ({
  authBackend: () => "supabase",
  accountIdForEmail: async () => "u1",
  endAllSessions: async () => {},
}));
vi.mock("@/lib/supabaseAuth", () => ({ adminSetPassword: async () => setResult }));
vi.mock("@/lib/wixPassword", () => ({ setMemberPassword: async () => {} }));

const { POST } = await import("@/app/api/auth/confirm-password-reset/route");
const TOKEN = "cd".repeat(32);

function post(body: unknown, cookieToken?: string) {
  return POST(
    new NextRequest("https://megadeal.co.nz/api/auth/confirm-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookieToken ? { cookie: `md_reset=${cookieToken}` } : {}) },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  Object.assign(calls, { breach: 0, consume: 0, restore: 0, revoke: 0 });
  setResult = { ok: true, data: { id: "u1" } };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("confirm password reset", () => {
  it("takes the link from the cookie, sets the password, ends other links and clears the cookie", async () => {
    const res = await post({ newPassword: "a long new password" }, TOKEN);
    expect(res.status).toBe(200);
    expect(calls.consume).toBe(1);
    expect(calls.revoke).toBe(1);
    expect(res.headers.get("set-cookie") ?? "").toMatch(/md_reset=;/);
  });

  it("turns away a malformed link before any expensive check", async () => {
    const res = await post({ newPassword: "a long new password" }, "not-a-token");
    expect(res.status).toBe(400);
    expect(calls.breach).toBe(0);
    expect(calls.consume).toBe(0);
  });

  it("refuses an oversized body without reading it", async () => {
    const res = await post(JSON.stringify({ newPassword: "x".repeat(10_000) }), TOKEN);
    expect(res.status).toBe(413);
    expect(calls.consume).toBe(0);
  });

  it("puts the link back when the auth service refuses the password, so the same link works again", async () => {
    setResult = { ok: false, code: "weak_password" };
    const res = await post({ newPassword: "a long new password" }, TOKEN);
    expect(res.status).toBe(400);
    expect(calls.restore).toBe(1);
    expect(calls.revoke).toBe(0);
  });
});
