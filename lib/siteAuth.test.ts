import { afterEach, describe, expect, it, vi } from "vitest";
import { loginMember, registerMember } from "./siteAuth";

/** What the sign-in and sign-up forms say when the answer isn't our own. */

const answer = (status: number, body: string, type = "text/html") =>
  vi.stubGlobal("fetch", async () => new Response(body, { status, headers: { "Content-Type": type } }));

afterEach(() => vi.unstubAllGlobals());

describe("sign-in and sign-up messages", () => {
  it("passes on the site's own sentence", async () => {
    answer(429, JSON.stringify({ error: "Too many attempts. Please wait a few minutes and try again." }), "application/json");
    expect(await loginMember("a@b.nz", "pw", "token")).toEqual({ status: "error", message: "Too many attempts. Please wait a few minutes and try again." });
  });

  it("explains a block by Cloudflare in front of the site (a breached password, or bot protection)", async () => {
    answer(403, "<!doctype html><title>Attention Required! | Cloudflare</title>");
    const out = await loginMember("a@b.nz", "pw", "token");
    expect(out.status === "error" && out.message).toMatch(/Forgot password/);
    answer(429, "<html>rate limited</html>");
    const signup = await registerMember("a@b.nz", "pw", "token");
    expect(signup.status === "error" && signup.message).toMatch(/data breach/);
  });

  it("says the service is unreachable for a failure in the middle", async () => {
    answer(502, "<html>Bad gateway</html>");
    const out = await loginMember("a@b.nz", "pw", "token");
    expect(out.status === "error" && out.message).toMatch(/couldn't reach our sign-in service/);
  });
});

describe("when the robot check didn't run in the browser", () => {
  it("says so before sending anything", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    let sent = false;
    vi.stubGlobal("fetch", async () => ((sent = true), new Response("{}")));
    const out = await registerMember("a@b.nz", "pw", null);
    expect(out.status === "error" && out.message).toMatch(/security check/);
    expect(sent).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("sign-up code that couldn't be sent (T240)", async () => {
  const { codeNotSentText, resendCode, waitText } = await import("./siteAuth");
  it("reads the route's answer, never 'sent' when it wasn't", async () => {
    answer(200, JSON.stringify({ status: "verify", sent: false, reason: "rate_limited", retryAfterSec: 57 }), "application/json");
    expect(await registerMember("a@b.nz", "pw", "token")).toMatchObject({ status: "verify", codeSent: false, retryAfterSec: 57 });
    answer(200, JSON.stringify({ status: "verify", sent: true }), "application/json");
    expect(await loginMember("a@b.nz", "pw", "token")).toMatchObject({ status: "verify", codeSent: true });
    answer(200, JSON.stringify({ status: "not-sent", sent: false, reason: "send_failed" }), "application/json");
    expect(await resendCode("a@b.nz")).toEqual({ sent: false, retryAfterSec: undefined, message: undefined });
    answer(200, JSON.stringify({ status: "sent" }), "application/json");
    expect(await resendCode("a@b.nz")).toEqual({ sent: true });
  });
  it("says how long to wait in words", () => {
    expect(waitText(45)).toBe("45 seconds");
    expect(waitText(60)).toBe("1 minute");
    expect(waitText(300)).toBe("5 minutes");
    expect(codeNotSentText(300)).toBe("We couldn't send the email just now. Try Resend in 5 minutes.");
  });
});
