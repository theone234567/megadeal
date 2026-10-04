import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { REFERRAL_BONUS_CREDITS, signupCodes } from "./referralBonus";

const isPromo = (c: string) => c === "WELCOME6" || c === "WELCOME3";

describe("signupCodes", () => {
  it("applies a promo and a referral together", () => {
    expect(signupCodes({ couponCode: "welcome6", referredByCode: " md1a2b3c " }, isPromo)).toEqual({
      promoCode: "WELCOME6",
      referralCode: "MD1A2B3C",
    });
  });

  it("still reads an older application's referral code from the promo box", () => {
    expect(signupCodes({ couponCode: "MD1A2B3C" }, isPromo)).toEqual({ promoCode: "", referralCode: "MD1A2B3C" });
  });

  it("prefers the referral box when both boxes hold a referral-looking code", () => {
    expect(signupCodes({ couponCode: "OTHER", referredByCode: "MDAAAAAA" }, isPromo).referralCode).toBe("MDAAAAAA");
  });

  it("gives nothing for empty codes", () => {
    expect(signupCodes({}, isPromo)).toEqual({ promoCode: "", referralCode: "" });
  });
});

// Approval against a fake Wix: a referred business that also used WELCOME6.
const merchants: Record<string, any> = {};
const increments = vi.fn(async (..._a: unknown[]) => true);
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./adminAudit", () => ({ logAdminAction: vi.fn(), auditTarget: (n: string) => n }));
vi.mock("./sendEmail", () => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("./merchantActivity", () => ({ logMerchantActivity: vi.fn() }));
vi.mock("./creditsAtomic", () => ({ incrementCreditsAtomically: (...a: unknown[]) => increments(...a) }));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: {
      get: async (_c: string, id: string) => merchants[id],
      update: async (_c: string, item: any) => item,
      query: (collection: string) => {
        const filters: Record<string, unknown> = {};
        const q: any = {
          eq: (k: string, v: unknown) => ((filters[k] = v), q),
          isNotEmpty: () => q,
          limit: () => q,
          find: async () => ({
            items:
              collection === "Merchants"
                ? Object.values(merchants).filter((m) => m.referralCode === filters.referralCode)
                : [],
          }),
        };
        return q;
      },
    },
    // The one-time promo and referral claims.
    fetchWithAuth: async () => new Response("{}", { status: 200 }),
  }),
}));

describe("approving a referred business", () => {
  beforeEach(() => {
    increments.mockClear();
    merchants.ref = { _id: "ref", email: "ref@example.com", businessName: "Referrer Cafe", status: "Approved", referralCode: "MDREF001", creditsBalance: 0 };
    merchants.new = { _id: "new", email: "new@example.com", businessName: "New Spa", status: "Pending", creditsBalance: 0, couponCode: "WELCOME6", referredByCode: "MDREF001" };
  });

  it("grants the launch offer and the referral bonus, and pays the referrer", async () => {
    const { PATCH } = await import("@/app/api/admin/merchants/[id]/route");
    const res = await PATCH(
      new NextRequest("http://x/api/admin/merchants/new", { method: "PATCH", body: JSON.stringify({ status: "Approved" }) }),
      { params: Promise.resolve({ id: "new" }) }
    );
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(increments.mock.calls.map((c) => [c[1], c[2]]));
    // 2 intro + 24 (WELCOME6, before launch) + 4 referral.
    expect(byId.new).toBe(2 + 24 + REFERRAL_BONUS_CREDITS);
    expect(byId.ref).toBe(REFERRAL_BONUS_CREDITS);
  });
});
