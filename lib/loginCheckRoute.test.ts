import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Admin > Check a login (app/api/admin/login-check). */

let admin = true;
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("@/lib/adminAudit", () => ({ logAdminAction: async () => {} }));
vi.mock("@/lib/authSession", () => ({
  authBackend: () => "supabase",
  fromOwnSite: (req: NextRequest) => req.headers.get("origin") === "https://megadeal.co.nz",
  loginInfo: async (email: string) => ({ email, exists: email === "owner@cafe.nz", confirmed: true, hasPassword: true, createdAt: null, confirmedAt: null, lastSignInAt: null, openSessions: 0 }),
}));

const ask = async (email: string, origin = "https://megadeal.co.nz") => {
  const { POST } = await import("@/app/api/admin/login-check/route");
  return POST(new NextRequest("https://megadeal.co.nz/api/admin/login-check", { method: "POST", headers: { origin }, body: JSON.stringify({ email }) }));
};

describe("checking a login", () => {
  it("says whether an email has a login, for admin only", async () => {
    expect((await (await ask("owner@cafe.nz")).json()).info).toMatchObject({ exists: true, confirmed: true });
    // A "+" arrives as typed.
    expect((await (await ask("owner+shop@example.nz")).json()).info).toMatchObject({ email: "owner+shop@example.nz" });
    expect((await ask("owner@cafe.nz", "https://evil.example")).status).toBe(403);
    expect((await (await ask("someone@else.nz")).json()).info).toMatchObject({ exists: false });
    expect((await ask("not an email")).status).toBe(400);
    admin = false;
    expect((await ask("owner@cafe.nz")).status).toBe(401);
  });
});
