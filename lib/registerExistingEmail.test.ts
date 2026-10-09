import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Signing up with an email that already has an account (app/api/auth/register). */

const counts = new Map<string, number>();
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async (key: string, max: number) => {
    const c = (counts.get(key) ?? 0) + 1;
    counts.set(key, c);
    return { limited: c > max };
  },
}));
vi.mock("@/lib/authRoutes", () => ({
  authPreflight: async (req: NextRequest) => {
    const body = await req.json();
    return { body, ip: "203.0.113.7", email: String(body.email).toLowerCase() };
  },
  passwordOk: () => true,
  PASSWORD_RULE: "",
}));
vi.mock("@/lib/pwnedPassword", () => ({ passwordSeenInBreaches: async () => false, BREACHED_PASSWORD_MESSAGE: "" }));
let existing = true;
vi.mock("@/lib/supabaseAuth", async (orig) => ({
  ...(await orig<typeof import("./supabaseAuth")>()),
  signUp: async () => ({ ok: true, data: existing ? { id: "x", identities: [] } : { id: "y", identities: [{ id: "i" }] } }),
}));
const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/sendEmail", () => ({ sendTransactionalEmail: async (m: { to: string; subject: string }) => (sent.push(m), true) }));

const register = (email: string) =>
  import("@/app/api/auth/register/route").then((r) =>
    r.POST(new NextRequest("https://megadeal.co.nz/api/auth/register", { method: "POST", body: JSON.stringify({ email, password: "a long password here" }) }))
  );

describe("signing up again with the same email", () => {
  it("answers the same as a new sign-up, emails the owner how to sign in, at most twice a day", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await (await register("Owner@Bistro.nz")).json()).toEqual({ status: "verify" });
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(sent).toEqual([
      { to: "owner@bistro.nz", subject: "You already have a MegaDeal business account", html: expect.stringContaining("Sign in to your business portal") },
      { to: "owner@bistro.nz", subject: "You already have a MegaDeal business account", html: expect.any(String) },
    ]);
  });

  it("sends nothing extra for a genuinely new sign-up (Supabase sends the code)", async () => {
    existing = false;
    sent.length = 0;
    expect(await (await register("new@bistro.nz")).json()).toEqual({ status: "verify" });
    await new Promise((r) => setTimeout(r, 10));
    expect(sent).toEqual([]);
  });
});
