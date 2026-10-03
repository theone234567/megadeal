import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { canRequestRevision, parseRevisionRequest, readRevision, revisionLines } from "./dealRevision";

const live = { _id: "d1", merchantEmail: "t@example.com", status: "Live", dealName: "Two coffees", description: "Two flat whites.", terms: "Mention MegaDeal when you book.", priceNow: 6, priceWas: 10, bookingRequirement: "not_required", quantityAvailable: null, dealCode: "MEGA-AB12C", productId: "p1", expiresAt: "2099-01-01T00:00:00.000Z" };

describe("parseRevisionRequest", () => {
  it("keeps only what changes, checked like an admin edit", () => {
    const { revision } = parseRevisionRequest({ changes: { dealName: "Two coffees", priceNow: "5", note: "x" }, note: " Price drop " }, live);
    expect(revision?.changes).toEqual({ priceNow: 5 });
    expect(revision?.note).toBe("Price drop");
  });

  it("never touches the deal code, and explains bad values", () => {
    expect(parseRevisionRequest({ changes: { dealCode: "NEW-CODE" } }, live).error).toMatch(/Nothing has changed/);
    expect(parseRevisionRequest({ changes: { priceNow: "12" } }, live).error).toMatch(/usual price can't be lower/);
    expect(parseRevisionRequest({ changes: { dealName: "" } }, live).error).toMatch(/1–80/);
  });

  it("reads back what it stored, and shows it as from → to", () => {
    const { revision } = parseRevisionRequest({ changes: { priceNow: 5, quantityAvailable: "20" } }, live);
    const row = { ...live, pendingRevision: JSON.stringify(revision) };
    expect(readRevision(row)?.changes).toEqual({ priceNow: 5, quantityAvailable: 20 });
    expect(revisionLines(readRevision(row)!, live)).toEqual([
      { label: "Deal price", from: "$6", to: "$5" },
      { label: "Quantity", from: "No limit", to: "20" },
    ]);
    expect(readRevision({ pendingRevision: "not json" })).toBeNull();
  });

  it("is for submitted deals that haven't finished", () => {
    expect(canRequestRevision(live)).toBe(true);
    expect(canRequestRevision({ ...live, status: "Pending Approval" })).toBe(true);
    expect(canRequestRevision({ ...live, status: "Draft" })).toBe(false);
    expect(canRequestRevision({ ...live, status: "Cancelled" })).toBe(false);
    expect(canRequestRevision({ ...live, expiresAt: "2000-01-01T00:00:00.000Z" })).toBe(false);
  });
});

// The business's request and the admin's decision, against a fake Wix.
let row: Record<string, any> = {};
let member: { id: string; email: string } | null = { id: "u1", email: "t@example.com" };
const update = vi.fn(async (_c: string, item: Record<string, any>) => item);
const activity = vi.fn();
vi.mock("./memberAuth", () => ({ getVerifiedMember: async () => member }));
vi.mock("./memberRateLimit", () => ({ memberRateLimited: async () => false, HOUR: 3_600_000 }));
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: { get: async () => row, update },
    productsV3: { updateProduct: vi.fn(async () => ({})), getProduct: vi.fn(async () => ({ product: { revision: "1", variantsInfo: { variants: [{ id: "v1" }] } } })) },
    // The Wix Stores product, read then updated when name/description/prices change.
    fetchWithAuth: vi.fn(async () =>
      new Response(JSON.stringify({ product: { id: "p1", revision: "1", name: "Two coffees", variantsInfo: { variants: [{ id: "v1", price: { actualPrice: { amount: "6" }, compareAtPrice: { amount: "10" } } }] } } }), { status: 200 })
    ),
  }),
}));
vi.mock("./merchantActivity", () => ({ logMerchantActivity: activity }));
vi.mock("./indexNowDeal", () => ({ notifyDealChanged: vi.fn() }));

const business = await import("@/app/api/deals/[id]/revision/route");
const admin = await import("@/app/api/admin/deals/[id]/route");
const req = (method: string, body?: unknown) => new NextRequest("http://x/api/d1", { method, ...(body ? { body: JSON.stringify(body) } : {}) });
const params = { params: Promise.resolve({ id: "d1" }) };

beforeEach(() => {
  update.mockClear();
  activity.mockClear();
  member = { id: "u1", email: "t@example.com" };
  row = { ...live };
});

describe("change requests end to end", () => {
  it("a business can ask, and the deal itself doesn't change", async () => {
    const res = await business.POST(req("POST", { changes: { priceNow: 5 }, note: "Cheaper now" }), params);
    expect(res.status).toBe(200);
    const saved = update.mock.calls[0][1];
    expect(saved.priceNow).toBe(6);
    expect(readRevision(saved)?.changes).toEqual({ priceNow: 5 });
  });

  it("only for its own deal", async () => {
    member = { id: "u2", email: "other@example.com" };
    expect((await business.POST(req("POST", { changes: { priceNow: 5 } }), params)).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("the admin's approval applies it and clears the request", async () => {
    row = { ...live, pendingRevision: JSON.stringify({ changes: { description: "Two flat whites or long blacks." }, note: "", submittedAt: "x" }) };
    const res = await admin.PATCH(req("PATCH", { revisionDecision: "approve" }), params);
    expect(res.status).toBe(200);
    const saved = update.mock.calls.at(-1)![1];
    expect(saved).toMatchObject({ description: "Two flat whites or long blacks.", pendingRevision: null });
    expect(saved.contentHistory[0].previous).toEqual({ description: "Two flat whites." });
    expect(activity.mock.calls.at(-1)![1].description).toMatch(/approved and is now showing/);
  });

  it("declining clears it, changes nothing else and tells the business why", async () => {
    row = { ...live, pendingRevision: JSON.stringify({ changes: { priceNow: 5 }, note: "", submittedAt: "x" }) };
    const res = await admin.PATCH(req("PATCH", { revisionDecision: "decline", revisionNote: "Price must match your menu" }), params);
    expect(res.status).toBe(200);
    expect(update.mock.calls.at(-1)![1]).toMatchObject({ priceNow: 6, pendingRevision: null });
    expect(activity.mock.calls.at(-1)![1].description).toMatch(/wasn't approved: Price must match your menu/);
  });
});
