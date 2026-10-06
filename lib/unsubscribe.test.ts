import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const unsubscribe = vi.fn(async (token: string) => token === "a".repeat(64));
vi.mock("@/lib/emailSignups", () => ({ unsubscribeEmailSignupByToken: (t: string) => unsubscribe(t) }));

const SITE = "https://megadeal.co.nz";
const TOKEN = "a".repeat(64);

describe("unsubscribing", () => {
  beforeEach(() => unsubscribe.mockClear());

  it("opening the email's link (or a scanner opening it) doesn't unsubscribe; it asks", async () => {
    const { GET } = await import("@/app/api/email-signup/unsubscribe/route");
    const res = await GET(new NextRequest(`${SITE}/api/email-signup/unsubscribe?token=${TOKEN}`));
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${SITE}/unsubscribe`);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/unsubscribe_token=a{64}/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\/api\/email-signup/);
  });

  it("the button unsubscribes, using the token kept from the link", async () => {
    const { POST } = await import("@/app/api/email-signup/unsubscribe/route");
    const res = await POST(new NextRequest(`${SITE}/api/email-signup/unsubscribe`, { method: "POST", headers: { cookie: `unsubscribe_token=${TOKEN}` } }));
    expect(unsubscribe).toHaveBeenCalledWith(TOKEN);
    expect(res.headers.get("location")).toBe(`${SITE}/unsubscribed?ok=1`);
  });

  it("a mail app's one-click unsubscribe works straight away", async () => {
    const { POST } = await import("@/app/api/email-signup/unsubscribe/route");
    const res = await POST(
      new NextRequest(`${SITE}/api/email-signup/unsubscribe?token=${TOKEN}`, { method: "POST", body: "List-Unsubscribe=One-Click", headers: { "content-type": "application/x-www-form-urlencoded" } })
    );
    expect(res.status).toBe(200);
    expect(unsubscribe).toHaveBeenCalledWith(TOKEN);
  });

  it("nothing happens without a real token", async () => {
    const { GET, POST } = await import("@/app/api/email-signup/unsubscribe/route");
    expect((await GET(new NextRequest(`${SITE}/api/email-signup/unsubscribe?token=<script>`))).headers.get("location")).toBe(`${SITE}/unsubscribed?ok=0`);
    expect((await POST(new NextRequest(`${SITE}/api/email-signup/unsubscribe`, { method: "POST" }))).headers.get("location")).toBe(`${SITE}/unsubscribed?ok=0`);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
