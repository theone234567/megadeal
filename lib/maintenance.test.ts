import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { blockedForMaintenance } from "./maintenance";

describe("pausing changes for the switch-over", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing unless switched on", () => {
    expect(blockedForMaintenance("POST", "/api/deals/create", undefined)).toBe(false);
    expect(blockedForMaintenance("POST", "/api/deals/create", "")).toBe(false);
  });

  it("turns away anything that saves a business's or visitor's changes", () => {
    for (const path of ["/api/deals/create", "/api/deals/draft", "/api/merchants/profile", "/api/merchants/apply", "/api/upload-photo", "/api/auth/register", "/api/auth/request-password-reset", "/api/email-signup", "/api/contact", "/api/deals/abc/status"]) {
      expect(blockedForMaintenance("POST", path, "writes"), path).toBe(true);
    }
    expect(blockedForMaintenance("PATCH", "/api/deals/abc", "writes")).toBe(true);
    expect(blockedForMaintenance("DELETE", "/api/deals/abc", "writes")).toBe(true);
  });

  it("keeps reading, signing in, admin, the scheduled jobs and unsubscribing working", () => {
    for (const [method, path] of [["GET", "/api/merchants/me"], ["GET", "/api/deals/mine"], ["POST", "/api/admin/deals/abc"], ["PATCH", "/api/admin/merchants/abc"], ["POST", "/api/cron/backup"], ["POST", "/api/auth/login"], ["POST", "/api/auth/logout"], ["POST", "/api/auth/email-hook"], ["POST", "/api/deals/track"], ["POST", "/api/places/autocomplete"], ["POST", "/api/email-signup/unsubscribe"], ["GET", "/api/health"]]) {
      expect(blockedForMaintenance(method, path, "writes"), `${method} ${path}`).toBe(false);
    }
  });

  it("doesn't let a lookalike path through", () => {
    expect(blockedForMaintenance("POST", "/api/auth/login-and-register", "writes")).toBe(true);
    expect(blockedForMaintenance("POST", "/api/healthy", "writes")).toBe(true);
  });

  it("the middleware answers 503 with the message, and lets everything else straight through", async () => {
    const { middleware } = await import("@/middleware");
    const req = (method: string, path: string) => new NextRequest(`https://megadeal.co.nz${path}`, { method });
    vi.stubEnv("MAINTENANCE_MODE", "writes");
    const blocked = await middleware(req("POST", "/api/deals/create"));
    expect(blocked?.status).toBe(503);
    expect(blocked?.headers.get("retry-after")).toBe("1800");
    expect((await blocked!.json()).error).toMatch(/paused/);
    const allowed = await middleware(req("POST", "/api/admin/deals/abc"));
    expect(allowed?.headers.get("x-middleware-next")).toBe("1");
    vi.stubEnv("MAINTENANCE_MODE", "");
    const normal = await middleware(req("POST", "/api/deals/create"));
    expect(normal?.headers.get("x-middleware-next")).toBe("1");
  });
});
