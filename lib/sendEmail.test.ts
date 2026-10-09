import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailHtmlToText, headerSafe } from "./emailText";

const wixFetch = vi.fn(async () => new Response("{}"));
vi.mock("./wixAdmin", () => ({ createWixAdminClient: () => ({ fetchWithAuth: wixFetch }) }));

describe("plain-text emails", () => {
  it("keep the words and every link's address", () => {
    const text = emailHtmlToText(
      `<div><img src="x" alt="MegaDeal"/><h1>One click and you&apos;re in</h1><p>Thanks &amp; welcome.</p><a href="https://megadeal.co.nz/confirm?t=1" style="x">Confirm my email</a><ul><li>One</li><li>Two</li></ul></div>`
    );
    expect(text).toContain("MegaDeal");
    expect(text).toContain("Thanks & welcome.");
    expect(text).toContain("Confirm my email: https://megadeal.co.nz/confirm?t=1");
    expect(text).toContain("- One");
    expect(text).not.toMatch(/<|style=/);
  });

  it("header values can't carry line breaks", () => {
    expect(headerSafe("Hello\r\nBcc: victim@x.nz")).toBe("Hello Bcc: victim@x.nz");
  });
});

describe("sending", () => {
  const resend = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}"));
  beforeEach(() => {
    vi.stubGlobal("fetch", resend);
    vi.spyOn(console, "error").mockImplementation(() => {});
    resend.mockReset();
    resend.mockImplementation(async () => new Response("{}"));
    wixFetch.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("on Wix when the switch is off", async () => {
    const { sendTransactionalEmail } = await import("./sendEmail");
    expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>" })).toBe(true);
    expect(wixFetch).toHaveBeenCalledOnce();
    expect(resend).not.toHaveBeenCalled();
  });

  it("through Resend when switched on: text part, reply-to, and one-click unsubscribe for list mail", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const { sendTransactionalEmail } = await import("./sendEmail");
    await sendTransactionalEmail({ to: "a@b.nz", subject: "Confirm", html: "<p>Hi</p>", replyTo: "hello@megadeal.co.nz", unsubscribeUrl: "https://megadeal.co.nz/api/email-signup/unsubscribe?token=abc" });
    const [url, init] = resend.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      to: ["a@b.nz"],
      subject: "Confirm",
      text: "Hi",
      reply_to: "hello@megadeal.co.nz",
      headers: { "List-Unsubscribe": "<https://megadeal.co.nz/api/email-signup/unsubscribe?token=abc>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    expect(wixFetch).not.toHaveBeenCalled();
  });

  it("refuses anything that isn't a plain address, on either provider", async () => {
    const { sendTransactionalEmail } = await import("./sendEmail");
    for (const to of ["a@b.nz\r\nBcc: victim@x.nz", "not-an-address", "a@b.nz, <evil>@x.nz", ""]) {
      expect(await sendTransactionalEmail({ to, subject: "x", html: "x" }), to).toBe(false);
    }
    expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "x", html: "x", replyTo: "x\nBcc: y@z.nz" })).toBe(false);
    expect(wixFetch).not.toHaveBeenCalled();
  });

  it("replies go to the first of several notification addresses", async () => {
    const { sendTransactionalEmail } = await import("./sendEmail");
    expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Welcome", html: "x", replyTo: "owner@example.nz, help@megadeal.co.nz" })).toBe(true);
    const body = JSON.parse(String(((wixFetch.mock.calls[0] as unknown[])[1] as RequestInit).body));
    expect(body.emailTransmission.replyTo).toEqual({ emailAddress: "owner@example.nz" });
  });

  it("sends to each of several notification addresses", async () => {
    const { sendTransactionalEmail } = await import("./sendEmail");
    await sendTransactionalEmail({ to: "a@b.nz, c@d.nz", subject: "New message", html: "x" });
    const body = JSON.parse(String((wixFetch.mock.calls[0] as unknown[])[1] && ((wixFetch.mock.calls[0] as unknown[])[1] as RequestInit).body));
    expect(body.emailTransmission.toRecipients).toEqual([{ emailAddress: "a@b.nz" }, { emailAddress: "c@d.nz" }]);
  });

  describe("when Resend says too many at once", () => {
    const tooMany = (body = '{"name":"rate_limit_exceeded"}') => new Response(body, { status: 429, headers: { "retry-after": "0.25" } });
    beforeEach(() => {
      vi.stubEnv("EMAIL_PROVIDER", "resend");
      vi.stubEnv("RESEND_API_KEY", "re_test");
    });

    it("waits and tries again, with the same key so it's never sent twice", async () => {
      resend.mockResolvedValueOnce(tooMany()).mockResolvedValueOnce(new Response("{}"));
      const { sendTransactionalEmail } = await import("./sendEmail");
      expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>" })).toBe(true);
      expect(resend).toHaveBeenCalledTimes(2);
      const keys = resend.mock.calls.map(([, init]) => (init.headers as Record<string, string>)["Idempotency-Key"]);
      expect(keys[0]).toBeTruthy();
      expect(keys[1]).toBe(keys[0]);
    });

    it("doesn't wait out a daily or monthly limit, and says that's why", async () => {
      resend.mockResolvedValueOnce(tooMany('{"name":"daily_quota_exceeded"}'));
      const { sendEmail } = await import("./sendEmail");
      expect(await sendEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>" })).toEqual({ ok: false, reason: "quota" });
      expect(resend).toHaveBeenCalledOnce();
    });

    it("gives up after a few tries", async () => {
      resend.mockImplementation(async () => tooMany());
      const { sendTransactionalEmail } = await import("./sendEmail");
      expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>" })).toBe(false);
      expect(resend).toHaveBeenCalledTimes(4);
    });

    it("doesn't wait past the time allowed", async () => {
      resend.mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "3" } }));
      const { sendTransactionalEmail } = await import("./sendEmail");
      const started = Date.now();
      expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>", withinMs: 1000 })).toBe(false);
      expect(resend).toHaveBeenCalledOnce();
      expect(Date.now() - started).toBeLessThan(500);
    });

    it("gives up on a Resend that doesn't answer, in time for Supabase's hook", async () => {
      // A fetch that only ends when its time limit aborts it.
      resend.mockImplementation(
        (_url, init) => new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
      );
      const { sendTransactionalEmail } = await import("./sendEmail");
      const started = Date.now();
      expect(await sendTransactionalEmail({ to: "a@b.nz", subject: "Hi", html: "<p>Hi</p>", withinMs: 300 })).toBe(false);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it("logs why Resend refused, without the address", async () => {
      const logged: unknown[][] = [];
      vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void logged.push(a));
      resend.mockResolvedValueOnce(new Response('{"name":"validation_error","message":"Invalid `to` field: someone@example.nz"}', { status: 422 }));
      const { sendTransactionalEmail } = await import("./sendEmail");
      expect(await sendTransactionalEmail({ to: "someone@example.nz", subject: "Hi", html: "<p>Hi</p>" })).toBe(false);
      const text = JSON.stringify(logged);
      expect(text).toContain("validation_error");
      expect(text).not.toContain("someone@example.nz");
    });

    it("waits as long as asked, within reason", async () => {
      const { retryDelayMs } = await import("./sendEmail");
      expect(retryDelayMs("2")).toBe(2000);
      expect(retryDelayMs("600")).toBe(5000);
      expect(retryDelayMs("0.01")).toBe(250);
      expect(retryDelayMs(null)).toBe(1000);
      expect(retryDelayMs("soon")).toBe(1000);
    });
  });
});
