import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Supabase's "send email" hook (app/api/auth/email-hook): signed requests only, sign-up codes only. */

const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string }) => (sent.push(m), true) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }) }));

const KEY = Buffer.from("a-test-secret-of-some-length!!").toString("base64");
const { POST } = await import("@/app/api/auth/email-hook/route");

function hook(payload: object, opts: { key?: string; at?: number } = {}) {
  const body = JSON.stringify(payload);
  const id = "msg_1";
  const ts = String(opts.at ?? Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(opts.key ?? KEY, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new NextRequest("https://megadeal.co.nz/api/auth/email-hook", {
    method: "POST",
    headers: { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` },
    body,
  });
}

const signup = { user: { email: "owner@cafe.nz" }, email_data: { email_action_type: "signup", token: "123456" } };

describe("email hook", () => {
  beforeEach(() => {
    sent.length = 0;
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", `v1,whsec_${KEY}`);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends the sign-up code from MegaDeal", async () => {
    expect((await POST(hook(signup))).status).toBe(200);
    expect(sent).toEqual([expect.objectContaining({ to: "owner@cafe.nz", subject: "123456 is your MegaDeal sign-up code" })]);
  });

  it("refuses a request not signed with our secret, or too old", async () => {
    const other = Buffer.from("someone-else's-secret").toString("base64");
    expect((await POST(hook(signup, { key: other }))).status).toBe(401);
    expect((await POST(hook(signup, { at: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(401);
    expect(sent).toEqual([]);
  });

  it("sends nothing the site doesn't offer: password codes, magic links, email changes", async () => {
    for (const type of ["recovery", "magiclink", "invite", "email_change", "email_change_new", "reauthentication"]) {
      const res = await POST(hook({ ...signup, email_data: { email_action_type: type, token: "123456" } }));
      expect(res.status, type).toBe(400);
    }
    expect(sent).toEqual([]);
  });
});
