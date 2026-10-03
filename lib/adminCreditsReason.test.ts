import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Admin credit changes need a reason (app/api/admin/merchants/[id]).
const merchant = { _id: "m1", email: "o@example.com", businessName: "Ok Cafe", status: "Approved", creditsBalance: 4 };
const writes = vi.fn();
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: { get: async () => merchant, update: writes, insert: writes, query: () => ({ eq: () => ({ find: async () => ({ items: [] }) }) }) },
    fetchWithAuth: writes,
  }),
}));
vi.mock("./creditsAtomic", () => ({ incrementCreditsAtomically: writes }));

const { PATCH } = await import("@/app/api/admin/merchants/[id]/route");
const call = (body: unknown) =>
  PATCH(new NextRequest("http://x/api/admin/merchants/m1", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "m1" }) });

describe("admin credit changes", () => {
  it("are refused without a reason, before anything is written", async () => {
    const res = await call({ creditsBalance: 10 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Say why/);
    expect(writes).not.toHaveBeenCalled();
  });
});
