import { afterEach, describe, expect, it, vi } from "vitest";
import { loginMember, registerMember } from "./siteAuth";

/** What the sign-in and sign-up forms say when the answer isn't our own. */

const answer = (status: number, body: string, type = "text/html") =>
  vi.stubGlobal("fetch", async () => new Response(body, { status, headers: { "Content-Type": type } }));

afterEach(() => vi.unstubAllGlobals());

describe("sign-in and sign-up messages", () => {
  it("passes on the site's own sentence", async () => {
    answer(429, JSON.stringify({ error: "Too many attempts. Please wait a few minutes and try again." }), "application/json");
    expect(await loginMember(null, "a@b.nz", "pw")).toEqual({ status: "error", message: "Too many attempts. Please wait a few minutes and try again." });
  });

  it("explains a block by Cloudflare in front of the site (a breached password, or bot protection)", async () => {
    answer(403, "<!doctype html><title>Attention Required! | Cloudflare</title>");
    const out = await loginMember(null, "a@b.nz", "pw");
    expect(out.status === "error" && out.message).toMatch(/Forgot password/);
    answer(429, "<html>rate limited</html>");
    const signup = await registerMember(null, "a@b.nz", "pw", "Bistro");
    expect(signup.status === "error" && signup.message).toMatch(/data breach/);
  });

  it("says the service is unreachable for a failure in the middle", async () => {
    answer(502, "<html>Bad gateway</html>");
    const out = await loginMember(null, "a@b.nz", "pw");
    expect(out.status === "error" && out.message).toMatch(/couldn't reach our sign-in service/);
  });
});
