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
    resend.mockClear();
    wixFetch.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("on Wix by default, as today", async () => {
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

  it("sends to each of several notification addresses", async () => {
    const { sendTransactionalEmail } = await import("./sendEmail");
    await sendTransactionalEmail({ to: "a@b.nz, c@d.nz", subject: "New message", html: "x" });
    const body = JSON.parse(String((wixFetch.mock.calls[0] as unknown[])[1] && ((wixFetch.mock.calls[0] as unknown[])[1] as RequestInit).body));
    expect(body.emailTransmission.toRecipients).toEqual([{ emailAddress: "a@b.nz" }, { emailAddress: "c@d.nz" }]);
  });
});
