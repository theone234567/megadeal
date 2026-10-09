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
  vi.stubEnv("ADMIN_NOTIFY_EMAIL", "owner@megadeal.co.nz");
});

describe("sign-up codes that can't be sent", () => {
  it("counts the login service or its email hook failing, not answers about the person", () => {
    expect(codeDidNotGoOut({ ok: false, status: 500, code: "unexpected_failure" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "hook_timeout" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 503, code: "unavailable" })).toBe(true);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "user_already_exists" })).toBe(false);
    expect(codeDidNotGoOut({ ok: false, status: 429, code: "over_email_send_rate_limit" })).toBe(false);
    expect(codeDidNotGoOut({ ok: false, status: 422, code: "weak_password" })).toBe(false);
    expect(codeDidNotGoOut({ ok: true })).toBe(false);
  });

  it("shows in Needs attention and emails the admin once, until a code goes out again", async () => {
    expect(await signupCodeProblem()).toBeNull();
    await noteSignupCodeProblem("hook_timeout");
    await noteSignupCodeProblem("hook_timeout");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("owner@megadeal.co.nz");
    expect(sent[0].html).toMatch(/Bot fight mode/);
    expect(await signupCodeProblem()).toMatchObject({ code: "hook_timeout" });
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
