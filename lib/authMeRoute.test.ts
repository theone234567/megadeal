import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** /api/auth/me answers the page even when the session can't be checked. */

let fail = false;
vi.mock("@/lib/memberAuth", () => ({
  getVerifiedMember: async () => {
    if (fail) throw new Error("connect ECONNREFUSED");
    return null;
  },
}));

afterEach(() => vi.unstubAllEnvs());

describe("the page's first check with the server", () => {
  it("says nobody is signed in when the session can't be checked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fail = true;
    const { GET } = await import("@/app/api/auth/me/route");
    const res = await GET(new NextRequest("https://megadeal.co.nz/api/auth/me"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ member: null });
  });
});
