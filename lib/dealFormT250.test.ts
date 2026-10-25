import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { parsePrice, priceError, PRICE_FORMAT_MESSAGE, PRICE_TOO_HIGH_MESSAGE } from "./priceLimit";
import { checkDealFields, type DealFieldRules } from "./dealSubmission";

// T250: deal form rules checked on the server.

const rules: DealFieldRules = {
  typeBlocked: () => null,
  maxDuration: (flash) => (flash ? 360 : 30),
  photoError: () => null,
};
const good = {
  dealName: "Pizza for two",
  description: "Two large pizzas.",
  terms: "Bookings essential.",
  priceNow: 30,
  priceWas: 50,
  isFlash: false,
  durationDays: 14,
  bookingRequirement: "required",
  category: "Food & Drink",
  photoUrl: "https://megadeal.co.nz/media/photos/p.jpg",
};
const err = (body: object) => {
  const res = checkDealFields(body, rules);
  return res.ok ? null : res.error;
};

describe("deal prices (T250)", () => {
  it("reads dollars and cents only", () => {
    expect(parsePrice("49")).toBe(49);
    expect(parsePrice(" 49.50 ")).toBe(49.5);
    expect(parsePrice(19.99)).toBe(19.99);
    for (const bad of ["1e3", "0.001", "-5", "49.", ".5", "4 9", "$49", "", null, undefined, NaN, Infinity, 0.001]) {
      expect(parsePrice(bad)).toBeNull();
    }
  });

  it("refuses exponents, fractions of a cent and anything over $10,000", () => {
    expect(priceError("1e3")).toBe(PRICE_FORMAT_MESSAGE);
    expect(priceError("0.001")).toBe(PRICE_FORMAT_MESSAGE);
    expect(priceError("99999999")).toBe(PRICE_TOO_HIGH_MESSAGE);
    expect(priceError("10000.01")).toBe(PRICE_TOO_HIGH_MESSAGE);
    expect(priceError("10000")).toBeNull();
    expect(priceError("")).toBeNull();
  });

  it("applies on submission, for both prices", () => {
    expect(err({ ...good, priceNow: "1e3", priceWas: undefined })).toBe(`Deal price: ${PRICE_FORMAT_MESSAGE}`);
    expect(err({ ...good, priceNow: 0.001 })).toBe(`Deal price: ${PRICE_FORMAT_MESSAGE}`);
    expect(err({ ...good, priceNow: 99999999 })).toBe(`Deal price: ${PRICE_TOO_HIGH_MESSAGE}`);
    expect(err({ ...good, priceWas: 20000 })).toBe(`Original price: ${PRICE_TOO_HIGH_MESSAGE}`);
    expect(err({ ...good, priceNow: 9999.99, priceWas: 10000 })).toBeNull();
    const ok = checkDealFields({ ...good, priceNow: "29.90" }, rules);
    expect(ok.ok && ok.fields.priceNow).toBe(29.9);
  });
});

// The draft and deal routes against a fake data client.
const rows = new Map<string, Record<string, any>>();
let codes = 0;
vi.mock("./memberAuth", () => ({ getVerifiedMember: async () => ({ id: "u1", email: "t@example.com" }) }));
vi.mock("./memberRateLimit", () => ({ memberRateLimited: async () => false, HOUR: 3_600_000 }));
vi.mock("./merchant", () => ({ getOrClaimMerchant: async () => ({ _id: "m1", status: "Approved" }) }));
vi.mock("./db/dealCodes", () => ({ newDealCode: async () => ["FEASTKT", "BRUNCHMQ", "SPADAYZX"][codes++ % 3] }));
vi.mock("./dataClient", () => ({
  createDataClient: () => ({
    items: {
      get: async (_c: string, id: string) => rows.get(id) ?? null,
      update: async (_c: string, item: Record<string, any>) => (rows.set(item._id, item), item),
      insert: async (_c: string, item: Record<string, any>) => {
        const saved = { ...item, _id: `d${rows.size + 1}` };
        rows.set(saved._id, saved);
        return saved;
      },
      query: () => ({ eq: () => ({ eq: () => ({ find: async () => ({ items: [] }) }) }) }),
    },
  }),
}));

async function saveDraft(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/deals/draft/route");
  const res = await POST(new NextRequest("http://localhost/api/deals/draft", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, data: await res.json() };
}

describe("drafts (T250)", () => {
  it("keep the code MegaDeal made for them across saves", async () => {
    const first = await saveDraft({ draft: { dealName: "Brunch", category: "Food & Drink" } });
    expect(first.status).toBe(200);
    const code = first.data.item.dealCode;
    expect(code).toBe("FEASTKT");
    const id = first.data.item._id;
    // Saved twice more, as the form does: the code it was shown comes back
    // in the field (a made code isn't "their own"), or nothing does.
    const second = await saveDraft({ draftId: id, baseRevision: 1, draft: { dealName: "Brunch for two", dealCode: code } });
    const third = await saveDraft({ draftId: id, baseRevision: 2, draft: { dealName: "Brunch for two", category: "Food & Drink", dealCode: "" } });
    expect(second.data.item.dealCode).toBe(code);
    expect(third.data.item.dealCode).toBe(code);
    expect(rows.get(id)?.dealCode).toBe(code);
  });

  it("someone else's draft reads as not found, the same as a missing one", async () => {
    rows.set("other", { _id: "other", merchantEmail: "someone@else.invalid", status: "Draft", dealName: "Theirs" });
    const { GET } = await import("@/app/api/deals/[id]/route");
    const get = async (id: string) => {
      const res = await GET(new NextRequest(`http://localhost/api/deals/${id}`), { params: Promise.resolve({ id }) });
      return { status: res.status, body: await res.json() };
    };
    const foreign = await get("other");
    const missing = await get("nope");
    expect(foreign).toEqual(missing);
    expect(foreign.status).toBe(404);
    expect(JSON.stringify(foreign.body)).not.toContain("Theirs");
  });
});
