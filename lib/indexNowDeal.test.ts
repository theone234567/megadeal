import { describe, it, expect, vi, beforeEach } from "vitest";

const submitted: string[][] = [];
vi.mock("./indexNow", () => ({
  submitUrlsToIndexNow: vi.fn(async (urls: string[]) => {
    submitted.push(urls);
  }),
}));

function client(product: any, merchants: any[] = []) {
  return {
    productsV3: { getProduct: vi.fn(async () => product) },
    items: {
      query: () => ({ eq: () => ({ limit: () => ({ find: async () => ({ items: merchants }) }) }) }),
    },
  };
}

// Waits for the fire-and-forget submission to land.
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("notifyDealChanged", () => {
  beforeEach(() => {
    submitted.length = 0;
    vi.resetModules();
  });

  it("sends the deal, its categories, its business, the homepage and flash deals", async () => {
    vi.stubEnv("SITE_LAUNCHED", "true");
    const { notifyDealChanged } = await import("./indexNowDeal");
    const product = {
      id: "p1",
      slug: "express-oil-change",
      allCategoriesInfo: { categories: [{ id: "9f5ab7d9-624c-4cc2-b923-7c3a2e97aa6d" }] },
    };
    const merchant = { _id: "985cb981-38d9", businessName: "Southside Mechanical", status: "Approved" };
    notifyDealChanged(client(product), { productId: "p1", isFlash: true, merchantEmail: "a@b.nz" }, merchant);
    await settle();
    expect(submitted).toHaveLength(1);
    expect(submitted[0].sort()).toEqual(
      [
        "https://megadeal.co.nz/",
        "https://megadeal.co.nz/flash-deals",
        "https://megadeal.co.nz/deal/express-oil-change",
        "https://megadeal.co.nz/category/home-car",
        "https://megadeal.co.nz/business/southside-mechanical-985cb981",
      ].sort()
    );
    vi.unstubAllEnvs();
  });

  it("looks the business up when it isn't passed, and skips one that isn't approved", async () => {
    vi.stubEnv("SITE_LAUNCHED", "true");
    const { notifyDealChanged } = await import("./indexNowDeal");
    const pending = { _id: "abc-1", businessName: "New Place", status: "Pending" };
    notifyDealChanged(client({ id: "p1", slug: "x" }, [pending]), { productId: "p1", merchantEmail: "a@b.nz" });
    await settle();
    expect(submitted[0]).toEqual(["https://megadeal.co.nz/", "https://megadeal.co.nz/deal/x"]);
    vi.unstubAllEnvs();
  });

  it("does nothing before launch", async () => {
    vi.stubEnv("SITE_LAUNCHED", "false");
    const { notifyDealChanged } = await import("./indexNowDeal");
    notifyDealChanged(client({ id: "p1", slug: "x" }), { productId: "p1" });
    await settle();
    expect(submitted).toHaveLength(0);
    vi.unstubAllEnvs();
  });
});
