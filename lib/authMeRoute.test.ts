import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** /api/auth/me tells the forms whose logins to use, whatever else fails. */

let fail = false;
vi.mock("@/lib/memberAuth", () => ({
  getVerifiedMember: async () => {
    if (fail) throw new Error("connect ECONNREFUSED");
    return null;
  },
}));

afterEach(() => vi.unstubAllEnvs());

describe("the page's first check with the server", () => {
  it("still names the logins in use when the session can't be checked", async () => {
    vi.stubEnv("AUTH_BACKEND", "supabase");
    vi.stubEnv("DATA_BACKEND", "postgres");
    vi.spyOn(console, "error").mockImplementation(() => {});
    fail = true;
    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET(new NextRequest("https://megadeal.co.nz/api/auth/me"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ member: null, authBackend: "supabase" });
  });
});
