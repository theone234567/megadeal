import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isCrossSiteWrite } from "./crossSiteWrite";

const HOST = "megadeal.co.nz";
const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(`https://megadeal.co.nz${path}`, { method: init.method ?? "POST", headers: init.headers });

describe("changes sent from another website are refused", () => {
  it("refuses another site's form or script", () => {
    expect(isCrossSiteWrite(req("/api/merchants/profile", { headers: { origin: "https://evil.example" } }), HOST)).toBe(true);
    expect(isCrossSiteWrite(req("/api/deals/create", { headers: { "sec-fetch-site": "cross-site" } }), HOST)).toBe(true);
    expect(isCrossSiteWrite(req("/api/admin/settings", { headers: { origin: "null" } }), HOST)).toBe(true);
  });

  it("allows our own pages, reads, and servers calling webhooks", () => {
    expect(isCrossSiteWrite(req("/api/merchants/profile", { headers: { origin: "https://megadeal.co.nz" } }), HOST)).toBe(false);
    expect(isCrossSiteWrite(req("/api/merchants/profile", { method: "GET", headers: { origin: "https://evil.example" } }), HOST)).toBe(false);
    expect(isCrossSiteWrite(req("/api/cron/backup"), HOST)).toBe(false);
    expect(isCrossSiteWrite(req("/api/deals/track", { headers: { "sec-fetch-site": "same-origin" } }), HOST)).toBe(false);
  });

  it("keeps a mail app's one-click unsubscribe working", () => {
    expect(isCrossSiteWrite(req("/api/email-signup/unsubscribe?token=x", { headers: { origin: "https://mail.example" } }), HOST)).toBe(false);
  });

  it("is checked by middleware before any API route runs", async () => {
    const { middleware } = await import("@/middleware");
    const res = await middleware(req("/api/merchants/profile", { headers: { origin: "https://evil.example" } }));
    expect(res?.status).toBe(403);
  });
});

describe("private API answers", () => {
  it("are marked never to be cached", async () => {
    const { middleware } = await import("@/middleware");
    for (const path of ["/api/admin/merchants", "/api/merchants/me", "/api/auth/me", "/api/deals/mine", "/api/deals/abc/pause"]) {
      const res = await middleware(new NextRequest(`https://megadeal.co.nz${path}`));
      expect(res?.headers.get("cache-control"), path).toBe("private, no-store");
    }
    const pub = await middleware(new NextRequest("https://megadeal.co.nz/api/version"));
    expect(pub?.headers.get("cache-control")).toBeNull();
  });
});

it("deal view counting stays cacheable-neutral (not marked)", async () => {
  const { middleware } = await import("@/middleware");
  const res = await middleware(new NextRequest("https://megadeal.co.nz/api/deals/track"));
  expect(res?.headers.get("cache-control")).toBeNull();
});
