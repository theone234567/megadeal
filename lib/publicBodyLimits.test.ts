import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The public forms (contact, deal alerts, sign-in, address search, deal
 * counters) refuse an oversized body before reading it all, so nobody can
 * make the site buffer and parse megabytes per request.
 */

vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }), getClientIp: () => "1.2.3.4" }));
vi.mock("@/lib/turnstile", () => ({ publicFormCheckOn: () => false, verifyTurnstile: async () => true }));
const inserted: unknown[] = [];
vi.mock("@/lib/emailSignups", () => ({ insertEmailSignup: async (x: unknown) => (inserted.push(x), true) }));
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async () => true }));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => ({ items: { insert: async () => ({}) } }) }));

const big = JSON.stringify({ email: "a@example.co.nz", name: "A", message: "x".repeat(40_000), padding: "y".repeat(40_000) });
const post = (url: string, body: string) =>
  new NextRequest(`https://megadeal.co.nz${url}`, { method: "POST", headers: { "content-type": "application/json" }, body });

describe("public forms refuse oversized bodies", () => {
  it("contact form", async () => {
    const { POST } = await import("@/app/api/contact/route");
    expect((await POST(post("/api/contact", big))).status).toBe(400);
  });

  it("deal-alert sign-up, without saving anything", async () => {
    const { POST } = await import("@/app/api/email-signup/route");
    expect((await POST(post("/api/email-signup", big))).status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("deal counters", async () => {
    const { POST } = await import("@/app/api/deals/track/route");
    expect((await POST(post("/api/deals/track", JSON.stringify({ productId: "x".repeat(10_000), event: "view" })))).status).toBe(400);
  });
});
