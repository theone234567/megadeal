import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// One live deal from one approved business, whole, as the database read
// builds it (lib/db/publicReads.ts).
const liveDeal = {
  id: "d1",
  slug: "pizza-for-two",
  name: "Pizza for two",
  priceNow: 49,
  status: "Live",
  startsAt: null,
  expiresAt: "2099-01-01T00:00:00Z",
  dealCode: "MEGA-49",
  businessName: "Harbour & Hearth",
  businessSlug: "harbour-hearth",
  businessPhone: "09 123 4567",
  businessBookingEmail: "book@example.com",
};

const loadLiveDeals = vi.fn();
const readDealBySlug = vi.fn();

// React's per-request cache() only exists in the server build.
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("./db/connection", () => ({ withDb: (fn: (db: unknown) => unknown) => fn({}) }));
vi.mock("./db/publicReads", () => ({
  loadLiveDeals: (...a: unknown[]) => loadLiveDeals(...a),
  readDealBySlug: (...a: unknown[]) => readDealBySlug(...a),
}));

async function load() {
  vi.resetModules();
  return (await import("./fetchDealServer")).fetchAllLiveDealsServer;
}

async function loadBoth() {
  vi.resetModules();
  const m = await import("./fetchDealServer");
  return { fetchAll: m.fetchAllLiveDealsServer, fetchDeal: m.fetchDealForSEO };
}

const reset = () => {
  loadLiveDeals.mockReset().mockResolvedValue([liveDeal]);
  // A read of one deal fails here, so reaching the database shows up as
  // a failed read (tried twice, then thrown) — not a deal from memory.
  readDealBySlug.mockReset().mockRejectedValue(new Error("not in this test"));
};

describe("fetchAllLiveDealsServer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
    reset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads the database once a minute, not on every page view", async () => {
    const fetchAll = await load();
    expect(await fetchAll()).toHaveLength(1);
    expect(await fetchAll()).toHaveLength(1);
    expect(loadLiveDeals).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    await fetchAll();
    expect(loadLiveDeals).toHaveBeenCalledTimes(2);
  });

  it("serves the last good listing when the database fails, instead of an empty page", async () => {
    const fetchAll = await load();
    await fetchAll();
    vi.advanceTimersByTime(61_000);
    loadLiveDeals.mockRejectedValue(new Error("database down"));
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
    reset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens a deal from a listing read in the last minute, whole, without reading the database", async () => {
    const { fetchAll, fetchDeal } = await loadBoth();
    await fetchAll();
    const deal = await fetchDeal("pizza-for-two");
    // The deal page gets what the cards leave out.
    expect(deal?.dealCode).toBe("MEGA-49");
    expect(deal?.businessPhone).toBe("09 123 4567");
    expect(loadLiveDeals).toHaveBeenCalledTimes(1);
  });

  it("reads the database for the deal once the listing is over a minute old", async () => {
    const { fetchAll, fetchDeal } = await loadBoth();
    await fetchAll();
    vi.advanceTimersByTime(61_000);
    const result = fetchDeal("pizza-for-two");
    const settled = expect(result).rejects.toBeTruthy();
    await vi.advanceTimersByTimeAsync(500);
    await settled;
    expect(readDealBySlug).toHaveBeenCalledTimes(2);
  });

  it("says a deal that isn't in a fresh listing is missing only if the database says so", async () => {
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
    reset();
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

  it("lets another instance use a listing read in the last minute, without reading the database", async () => {
    const first = await loadBoth();
    await first.fetchAll();
    expect(loadLiveDeals).toHaveBeenCalledTimes(1);

    // A fresh module is a fresh instance: nothing in its own memory.
    const second = await loadBoth();
    expect(await second.fetchAll()).toHaveLength(1);
    expect((await second.fetchDeal("pizza-for-two"))?.dealCode).toBe("MEGA-49");
    expect(loadLiveDeals).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    const third = await loadBoth();
    await third.fetchAll();
    expect(loadLiveDeals).toHaveBeenCalledTimes(2);
  });
});
