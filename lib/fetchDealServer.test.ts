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

async function loadBoth() {
  vi.resetModules();
  const m = await import("./fetchDealServer");
  return { fetchAll: m.fetchAllLiveDealsServer, fetchDeal: m.fetchDealForSEO };
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

describe("fetchDealForSEO", () => {
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

  it("opens a deal from a listing read in the last minute, whole, without reading Wix", async () => {
    const { fetchAll, fetchDeal } = await loadBoth();
    await fetchAll();
    const deal = await fetchDeal("pizza-for-two");
    // The deal page gets what the cards leave out.
    expect(deal?.dealCode).toBe("MEGA-49");
    expect(deal?.businessPhone).toBe("09 123 4567");
    expect(searchAllProducts).toHaveBeenCalledTimes(1);
  });

  it("reads Wix for the deal once the listing is over a minute old", async () => {
    const { fetchAll, fetchDeal } = await loadBoth();
    await fetchAll();
    vi.advanceTimersByTime(61_000);
    // The mocked client can't look a product up, so reaching Wix shows up
    // as a failed read (tried twice, then thrown) — not a deal from memory.
    const result = fetchDeal("pizza-for-two");
    const settled = expect(result).rejects.toBeTruthy();
    await vi.advanceTimersByTimeAsync(500);
    await settled;
  });

  it("says a deal that isn't in a fresh listing is missing only if Wix says so", async () => {
    const { fetchAll, fetchDeal } = await loadBoth();
    await fetchAll();
    const result = fetchDeal("not-in-the-listing");
    const settled = expect(result).rejects.toBeTruthy();
    await vi.advanceTimersByTimeAsync(500);
    await settled;
  });
});

describe("the listing shared between server instances", () => {
  const store = new Map<string, Response>();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
    searchAllProducts.mockReset().mockResolvedValue([product]);
    dealsFind.mockReset().mockResolvedValue({ items: [dealRow] });
    store.clear();
    // A stand-in for Cloudflare's per-data-centre cache (caches.default).
    (globalThis as any).caches = {
      default: {
        match: async (key: string) => store.get(key)?.clone(),
        put: async (key: string, res: Response) => void store.set(key, res),
      },
    };
  });
  afterEach(() => {
    delete (globalThis as any).caches;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("lets another instance use a listing read in the last minute, without reading Wix", async () => {
    const first = await loadBoth();
    await first.fetchAll();
    expect(searchAllProducts).toHaveBeenCalledTimes(1);

    // A fresh module is a fresh instance: nothing in its own memory.
    const second = await loadBoth();
    expect(await second.fetchAll()).toHaveLength(1);
    expect((await second.fetchDeal("pizza-for-two"))?.dealCode).toBe("MEGA-49");
    expect(searchAllProducts).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    const third = await loadBoth();
    await third.fetchAll();
    expect(searchAllProducts).toHaveBeenCalledTimes(2);
  });
});
