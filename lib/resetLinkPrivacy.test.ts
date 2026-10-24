import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isPixelFreePath, isTrackingFreePath, urlWithoutQuery } from "./sensitivePaths";

/**
 * Security audit of 10 Oct 2026, finding 1: a password-reset token never
 * stays in the address bar (where analytics and advertising scripts could
 * read it), and no tracking script runs on the reset page.
 */

const TOKEN = "ab".repeat(32);

describe("opening a reset link", () => {
  it("moves the token into an HttpOnly cookie and sends the browser to the plain address", async () => {
    const { middleware } = await import("@/middleware");
    const res = (await middleware(new NextRequest(`https://megadeal.co.nz/reset-password?token=${TOKEN}`)))!;
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://megadeal.co.nz/reset-password");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`md_reset=${TOKEN}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("drops a token that isn't the right shape instead of storing it", async () => {
    const { middleware } = await import("@/middleware");
    const res = (await middleware(new NextRequest(`https://megadeal.co.nz/reset-password?token=<script>`)))!;
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("script");
  });

  it("serves the plain page uncached and unindexed", async () => {
    const { middleware } = await import("@/middleware");
    const res = (await middleware(new NextRequest("https://megadeal.co.nz/reset-password")))!;
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});

describe("the business unsubscribe page", () => {
  it("is never cached, indexed or passed on as a Referer", async () => {
    const { middleware } = await import("@/middleware");
    const res = (await middleware(new NextRequest("https://megadeal.co.nz/stop-emails?m=x&s=y")))!;
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});

describe("pages without tracking", () => {
  it("covers the reset page, sign-in callback, business unsubscribe and admin, and nothing public", () => {
    for (const p of ["/reset-password", "/login-callback", "/stop-emails", "/admin", "/admin/businesses/1"]) expect(isTrackingFreePath(p), p).toBe(true);
    for (const p of ["/", "/deal/x", "/reset-passwords", "/administrator"]) expect(isTrackingFreePath(p), p).toBe(false);
  });

  it("keeps the Meta Pixel off the business portal too, but not the public pages", () => {
    for (const p of ["/portal", "/portal/new-deal", "/admin", "/reset-password"]) expect(isPixelFreePath(p), p).toBe(true);
    for (const p of ["/", "/deal/x", "/list-your-business", "/portals"]) expect(isPixelFreePath(p), p).toBe(false);
    expect(isTrackingFreePath("/portal")).toBe(false);
  });

  it("logs addresses without their query or fragment", () => {
    expect(urlWithoutQuery(`https://megadeal.co.nz/reset-password?token=${TOKEN}#x`)).toBe("https://megadeal.co.nz/reset-password");
    expect(urlWithoutQuery(undefined)).toBe("");
  });
});
