import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const counts = new Map<string, number>();
vi.mock("./rateLimit", () => ({
  getClientIp: (req: NextRequest) => req.headers.get("x-test-ip") ?? "1.1.1.1",
  checkRateLimit: async (key: string, limit: number) => {
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return { limited: n > limit };
  },
}));
vi.mock("./turnstile", () => ({ verifyTurnstile: async (token: unknown) => token === "solved" }));
vi.mock("./authSession", () => ({ authBackend: () => "supabase", fromOwnSite: () => true }));

const { authPreflight } = await import("./authRoutes");

const req = (body: object, ip = "1.1.1.1") =>
  new NextRequest("https://megadeal.co.nz/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://megadeal.co.nz", "x-test-ip": ip },
    body: JSON.stringify(body),
  });

describe("authPreflight", () => {
  beforeEach(() => counts.clear());

  it("junk without the robot check can't lock a business out", async () => {
    // Many requests for the owner's address, from many places, none solved.
    for (let i = 0; i < 30; i++) {
      const pre = await authPreflight(req({ email: "owner@cafe.nz" }, `9.9.9.${i}`), { limitKey: "login", perIp: 20, captcha: true });
      expect("stop" in pre && pre.stop.status).toBe(400);
    }
    // The owner still gets in.
    const owner = await authPreflight(req({ email: "owner@cafe.nz", captchaToken: "solved" }), { limitKey: "login", perIp: 20, captcha: true });
    expect("body" in owner).toBe(true);
  });

  it("still limits solved attempts per address", async () => {
    let last: Awaited<ReturnType<typeof authPreflight>> | null = null;
    for (let i = 0; i < 11; i++) {
      last = await authPreflight(req({ email: "owner@cafe.nz", captchaToken: "solved" }, `8.8.8.${i}`), { limitKey: "login", perIp: 20, captcha: true });
    }
    expect(last && "stop" in last && last.stop.status).toBe(429);
  });

  it("limits code checks per address (no robot check there)", async () => {
    let last: Awaited<ReturnType<typeof authPreflight>> | null = null;
    for (let i = 0; i < 11; i++) {
      last = await authPreflight(req({ email: "owner@cafe.nz" }, `7.7.7.${i}`), { limitKey: "verify", perIp: 30, captcha: false });
    }
    expect(last && "stop" in last && last.stop.status).toBe(429);
  });
});
