import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// One live deal from one approved business, as Wix returns them.
const product = {
  id: "p1",
  slug: "pizza-for-two",
  name: "Pizza for two",
  priceData: { price: 49 },
  allCategoriesInfo: { categories: [] },
};
const dealRow = {
  productId: "p1",
  merchantEmail: "owner@example.com",
  status: "Live",
  expiresAt: "2099-01-01T00:00:00Z",
  dealCode: "MEGA-49",
};
const merchant = {
  _id: "m1",
  email: "owner@example.com",
  businessName: "Harbour & Hearth",
  status: "Approved",
  phone: "09 123 4567",
  bookingEmail: "book@example.com",
};

const searchAllProducts = vi.fn();
const dealsFind = vi.fn();

// React's per-request cache() only exists in the server build.
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("./wixAdmin", () => ({
  createWixAdminClient: () => ({
    items: {
      query: () => ({
        isNotEmpty: () => ({ limit: () => ({ find: dealsFind }) }),
      }),
    },
  }),
}));
vi.mock("./searchAllProducts", () => ({ searchAllProducts: (...a: unknown[]) => searchAllProducts(...a) }));
vi.mock("./queryAll", () => ({ queryAllItems: async () => [merchant] }));

async function load() {
  vi.resetModules();
  return (await import("./fetchDealServer")).fetchAllLiveDealsServer;
}

describe("fetchAllLiveDealsServer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
    searchAllProducts.mockReset().mockResolvedValue([product]);
    dealsFind.mockReset().mockResolvedValue({ items: [dealRow] });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads Wix once a minute, not on every page view", async () => {
    const fetchAll = await load();
    expect(await fetchAll()).toHaveLength(1);
    expect(await fetchAll()).toHaveLength(1);
    expect(searchAllProducts).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    await fetchAll();
    expect(searchAllProducts).toHaveBeenCalledTimes(2);
  });

  it("serves the last good listing when Wix fails, instead of an empty page", async () => {
    const fetchAll = await load();
    await fetchAll();
    vi.advanceTimersByTime(61_000);
    searchAllProducts.mockRejectedValue(new Error("Wix down"));
    expect(await fetchAll()).toHaveLength(1);

    // Past the stale window, nothing is better than something that old.
    vi.advanceTimersByTime(16 * 60_000);
    expect(await fetchAll()).toEqual([]);
  });

  it("sends listings without contact details or the deal code", async () => {
    const fetchAll = await load();
    const [deal] = await fetchAll();
    expect(deal.businessName).toBe("Harbour & Hearth");
    expect(deal.businessPhone).toBeNull();
    expect(deal.businessBookingEmail).toBeNull();
    expect(deal.dealCode).toBeNull();
  });
});
