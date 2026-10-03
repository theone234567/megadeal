import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { parseTestDealInput, TEST_DEAL_PHOTOS, type TestDeal } from "./testDeals";

// "Copy to real draft" (app/api/admin/test-deals/[id]/route.ts), against a
// fake Wix: the only test-deal action that writes anything real.
const { fields } = parseTestDealInput({
  businessName: "Test Spa", suburb: "", dealName: "Express facial", category: "Beauty & Spa",
  description: "A 30-minute facial.", terms: "Bookings essential.", priceNow: 45, priceWas: 90, isFlash: true,
  durationMinutes: 120, bookingRequirement: "required", dealCode: "GLOW20", photoUrl: TEST_DEAL_PHOTOS[1].src,
});
const test: TestDeal = { ...fields!, id: "t1", createdAt: "x", updatedAt: "x", startedAt: "2026-10-01T00:00:00.000Z" };

let admin = true;
let merchant: Record<string, unknown> | null = null;
let draftCount = 0;
const insert = vi.fn(async (_c: string, row: Record<string, unknown>) => ({ ...row, _id: "new-draft" }));

vi.mock("./adminSession", () => ({ isAdminRequest: async () => admin }));
vi.mock("./testDealStore", () => ({
  getTestDeal: async (id: string) => (id === "t1" ? test : null),
  restartTestDeal: vi.fn(), updateTestDeal: vi.fn(), deleteTestDeal: vi.fn(),
}));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: {
      get: async () => merchant,
      query: () => ({ eq: () => ({ eq: () => ({ find: async () => ({ items: Array.from({ length: draftCount }) }) }) }) }),
      insert,
    },
  }),
}));

const { POST } = await import("@/app/api/admin/test-deals/[id]/route");

const call = (id: string, body: unknown) =>
  POST(new NextRequest(`http://x/api/admin/test-deals/${id}`, { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  admin = true;
  merchant = { _id: "m1", email: "Owner@Example.com", businessName: "Real Spa", status: "Approved" };
  draftCount = 0;
  insert.mockClear();
});

describe("copy test deal to a real draft", () => {
  it("creates a Draft for that business with a fresh MEGA code and no photo", async () => {
    const res = await call("t1", { action: "copy", merchantId: "m1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ draftId: "new-draft", businessName: "Real Spa" });
    const row = insert.mock.calls[0][1];
    expect(row).toMatchObject({ status: "Draft", merchantEmail: "owner@example.com", dealName: "Express facial", isFlash: true, photoUrl: "" });
    expect(row.dealCode).toMatch(/^MEGA-[A-Z0-9]{5}$/);
    expect(row).not.toHaveProperty("productId");
    expect(row).not.toHaveProperty("expiresAt");
  });

  it("refuses non-admins, suspended businesses and full draft lists", async () => {
    admin = false;
    expect((await call("t1", { action: "copy", merchantId: "m1" })).status).toBe(401);
    admin = true;
    merchant = { ...merchant, status: "Suspended" };
    expect((await call("t1", { action: "copy", merchantId: "m1" })).status).toBe(409);
    merchant = { ...merchant, status: "Approved" };
    draftCount = 25;
    expect((await call("t1", { action: "copy", merchantId: "m1" })).status).toBe(409);
    merchant = null;
    expect((await call("t1", { action: "copy", merchantId: "m1" })).status).toBe(404);
    expect((await call("gone", { action: "copy", merchantId: "m1" })).status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });
});
