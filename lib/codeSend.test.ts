import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Sign-up code emails that couldn't go out (SEO pack T240), and the
 *  repeated-sign-up mark (T241): register, resend and sign-in. */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }), getRateLimitKv: async () => null }));
vi.mock("@/lib/authRoutes", () => ({
  authPreflight: async (req: NextRequest) => {
    const body = await req.json();
    return { body, ip: "203.0.113.7", email: String(body.email).toLowerCase() };
  },
  passwordOk: () => true,
  PASSWORD_RULE: "",
}));
vi.mock("@/lib/pwnedPassword", () => ({ passwordSeenInBreaches: async () => false, BREACHED_PASSWORD_MESSAGE: "" }));
vi.mock("@/lib/signupCodeAttempts", () => ({ clearWrongCodes: async () => {} }));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async () => true }));
vi.mock("@/lib/authSession", () => ({ setSessionCookies: () => {} }));
let unconfirmed: string | null = null;
vi.mock("@/lib/db/connection", () => ({ withDb: async (fn: (db: unknown) => unknown) => fn({}) }));
vi.mock("@/lib/unconfirmedSignups", () => ({ unconfirmedAccountId: async () => unconfirmed }));

type Outcome = { ok: true; data: any } | { ok: false; status: number; code: string; retryAfterSec?: number };
let next: Outcome = { ok: true, data: {} };
const calls: string[] = [];
vi.mock("@/lib/supabaseAuth", () => ({
  SIGNED_UP_AGAIN: "signup_repeated_at",
  signUp: async () => (calls.push("signUp"), next),
  signUpHitExistingAccount: (d: any) => Array.isArray(d?.identities) && d.identities.length === 0,
  resendSignupCode: async () => (calls.push("resend"), next),
  signInWithPassword: async () => ({ ok: false, status: 400, code: "email_not_confirmed" }),
  markSignedUpAgain: async (id: string) => (calls.push(`mark ${id}`), { ok: true, data: { id } }),
  createUnconfirmedAccount: async (email: string) => (calls.push(`keep ${email}`), { ok: true, data: { id: "new" } }),
}));

const post = (route: string, body: object) =>
  import(`@/app/api/auth/${route}/route`).then(async (r) => {
    const res = await r.POST(new NextRequest(`https://megadeal.co.nz/api/auth/${route}`, { method: "POST", body: JSON.stringify(body) }));
    return [res.status, await res.json()];
  });
const perAddress: Outcome = { ok: false, status: 429, code: "over_email_send_rate_limit", retryAfterSec: 57 };
const projectWide: Outcome = { ok: false, status: 429, code: "over_email_send_rate_limit" };
const hookDown: Outcome = { ok: false, status: 500, code: "hook_timeout" };
const body = { email: "Owner@Bistro.nz", password: "a long password here" };

describe("register", () => {
  it("says sent only when the code went out", async () => {
    next = { ok: true, data: { id: "u", identities: [{}] } };
    expect(await post("register", body)).toEqual([200, { status: "verify", sent: true }]);
    next = perAddress;
    expect(await post("register", body)).toEqual([200, { status: "verify", sent: false, reason: "rate_limited", retryAfterSec: 57 }]);
  });

  it("keeps a new sign-up the project-wide limit refused, so Resend can send its code later", async () => {
    calls.length = 0;
    next = projectWide;
    expect(await post("register", body)).toEqual([200, { status: "verify", sent: false, reason: "rate_limited", retryAfterSec: 300 }]);
    expect(calls).toEqual(["signUp", "keep owner@bistro.nz"]);
  });

  it("answers an existing account the same as a new one", async () => {
    next = { ok: true, data: { id: "x", identities: [] } };
    expect(await post("register", body)).toEqual([200, { status: "verify", sent: true }]);
  });

  it("marks an unconfirmed account signed up again, even when this code didn't go out (T241)", async () => {
    unconfirmed = "u1";
    for (const outcome of [{ ok: true, data: { id: "u1", identities: [{}] } } as Outcome, perAddress]) {
      calls.length = 0;
      next = outcome;
      await post("register", body);
      expect(calls).toEqual(["signUp", "mark u1"]);
    }
    unconfirmed = null;
  });

  it("still says it couldn't create the account when the service fails", async () => {
    next = hookDown;
    expect((await post("register", body))[0]).toBe(502);
  });
});

describe("resend, by email alone", () => {
  it("answers sent, or why not and when to try again", async () => {
    next = { ok: true, data: {} };
    expect(await post("resend-code", { email: "a@b.nz" })).toEqual([200, { status: "sent" }]);
    next = perAddress;
    expect(await post("resend-code", { email: "a@b.nz" })).toEqual([200, { status: "not-sent", sent: false, reason: "rate_limited", retryAfterSec: 57 }]);
    next = hookDown;
    expect(await post("resend-code", { email: "a@b.nz" })).toEqual([200, { status: "not-sent", sent: false, reason: "send_failed" }]);
    // Any other answer about the address reads as sent: no way to tell who has an account.
    next = { ok: false, status: 400, code: "validation_failed" };
    expect(await post("resend-code", { email: "a@b.nz" })).toEqual([200, { status: "sent" }]);
  });
});

describe("sign-in with an unconfirmed email", () => {
  it("goes to the code screen, saying whether the new code went out", async () => {
    next = { ok: true, data: {} };
    expect(await post("login", { email: "a@b.nz", password: "pw" })).toEqual([200, { status: "verify", sent: true }]);
    next = perAddress;
    expect(await post("login", { email: "a@b.nz", password: "pw" })).toEqual([200, { status: "verify", sent: false, reason: "rate_limited", retryAfterSec: 57 }]);
  });
});
