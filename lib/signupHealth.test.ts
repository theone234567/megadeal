import { beforeEach, describe, expect, it, vi } from "vitest";

/** Whether new businesses can get their sign-up code (lib/signupHealth.ts). */

vi.mock("server-only", () => ({}));
const kv = new Map<string, string>();
vi.mock("./rateLimit", () => ({
  getRateLimitKv: async () => ({ get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v) }),
}));
const sent: { to: string; subject: string; html: string }[] = [];
vi.mock("./sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string; html: string }) => (sent.push(m), true) }));
vi.mock("./afterResponse", () => ({ afterResponse: (task: () => Promise<unknown>) => void task() }));

const { codeDidNotGoOut, noteSignupCodeProblem, noteSignupCodeSent, signupCodeProblem } = await import("./signupHealth");

beforeEach(() => {
  kv.clear();
  sent.length = 0;
  vi.stubEnv("ADMIN_NOTIFY_EMAIL", "admin@example.nz");
});

describe("sign-up codes that can't be sent", () => {
  it("counts the login service or its email hook failing, not answers about the person", () => {
    expect(codeDidNotGoOut({ ok: false, status: 500, code: "unexpected_failure" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "hook_timeout" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 503, code: "unavailable" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "user_already_exists" })).toBe(false);
    expect(codeDidNotGoOut({ ok: false, status: 429, code: "over_email_send_rate_limit" })).toBe(false);
    // The hook's own per-address limit: one address asked too often.
    expect(codeDidNotGoOut({ ok: false, status: 429, code: "hook_response_error" })).toBe(false);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "weak_password" })).toBe(false);
    expect(codeDidNotGoOut({ ok: true })).toBe(false);
  });

  it("shows in Needs attention and emails the admin once, until a code goes out again", async () => {
    expect(await signupCodeProblem()).toBeNull();
    await noteSignupCodeProblem("hook_timeout");
    await noteSignupCodeProblem("hook_timeout");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("admin@example.nz");
    expect(sent[0].html).toMatch(/Bot fight mode/);
    // With the site's own reading of why (here: no visit to the hook just now).
    expect(await signupCodeProblem()).toMatchObject({ code: "hook_timeout: Supabase didn't reach the site" });
    await new Promise((r) => setTimeout(r, 5));
    await noteSignupCodeSent();
    expect(await signupCodeProblem()).toBeNull();
  });

  it("says what to check for a reset email that couldn't be sent", async () => {
    await noteSignupCodeProblem("email_not_sent", "password reset");
    expect(sent[0].subject).toMatch(/password reset emails/);
    expect(sent[0].html).toMatch(/resend\.com/);
    expect(sent[0].html).not.toMatch(/Bot fight mode/);
    expect(await signupCodeProblem()).toMatchObject({ kind: "password reset" });
  });

  it("keeps what it puts in the email to plain words", async () => {
    await noteSignupCodeProblem('<img src=x onerror="alert(1)">');
    expect(sent[0].html).not.toMatch(/<img src=x|onerror=/);
  });
});

describe("whether a sign-up code went out (T240)", async () => {
  const { codeSendOf, projectEmailLimitHit } = await import("./signupHealth");
  it("tells the person's own wait from the whole project's limit", () => {
    expect(codeSendOf({ ok: true })).toEqual({ sent: true });
    expect(codeSendOf({ ok: false, status: 429, code: "over_email_send_rate_limit", retryAfterSec: 42 })).toEqual({ sent: false, reason: "rate_limited", retryAfterSec: 42 });
    expect(projectEmailLimitHit({ ok: false, status: 429, code: "over_email_send_rate_limit", retryAfterSec: 42 })).toBe(false);
    expect(projectEmailLimitHit({ ok: false, status: 429, code: "over_email_send_rate_limit" })).toBe(true);
    expect(codeSendOf({ ok: false, status: 429, code: "over_email_send_rate_limit" })).toEqual({ sent: false, reason: "rate_limited", retryAfterSec: 300 });
    expect(codeSendOf({ ok: false, status: 429, code: "hook_response_error" })).toEqual({ sent: false, reason: "rate_limited", retryAfterSec: 60 });
    expect(codeSendOf({ ok: false, status: 500, code: "hook_timeout" })).toEqual({ sent: false, reason: "send_failed" });
    expect(codeSendOf({ ok: false, status: 422, code: "user_already_exists" })).toEqual({ sent: true });
  });
});

describe("what stopped a sign-up code (owner's alert, 31 Oct 2026)", async () => {
  const { signupCodeDiagnosis } = await import("./signupHealth");
  const now = Date.parse("2026-10-31T01:34:00Z");
  const justNow = "2026-10-31T01:33:58Z";
  const yesterday = "2026-10-30T01:00:00Z";

  it("names Resend's answer when the hook's send just failed", () => {
    expect(signupCodeDiagnosis(justNow, { at: justNow, reason: "quota" }, now)?.label).toBe("Resend's sending limit reached");
    expect(signupCodeDiagnosis(justNow, { at: justNow, reason: "refused", status: 422 }, now)?.label).toBe("Resend refused the email (422)");
    expect(signupCodeDiagnosis(justNow, { at: justNow, reason: "timeout" }, now)?.label).toBe("Resend didn't answer in time");
  });

  it("points at Cloudflare when Supabase didn't reach the hook just now", () => {
    const d = signupCodeDiagnosis(yesterday, null, now);
    expect(d?.label).toBe("Supabase didn't reach the site");
    expect(d?.check).toMatch(/Bot fight mode/);
  });

  it("ignores an old send failure", () => {
    expect(signupCodeDiagnosis(justNow, { at: yesterday, reason: "quota" }, now)).toBeNull();
  });

  it("puts the reason in the alert", async () => {
    kv.clear();
    sent.length = 0;
    process.env.ADMIN_NOTIFY_EMAIL = "admin@megadeal.test";
    kv.set("auth:email-hook:last", new Date().toISOString());
    kv.set("auth:email-hook:send-failure", JSON.stringify({ at: new Date().toISOString(), reason: "quota", status: 429 }));
    const { noteSignupCodeProblem } = await import("./signupHealth");
    await noteSignupCodeProblem("unexpected_failure");
    await new Promise((r) => setTimeout(r, 0));
    expect(sent[0]?.html).toContain("unexpected_failure: Resend's sending limit reached");
    expect(sent[0]?.html).toContain("resend.com &gt; Usage");
  });
});
