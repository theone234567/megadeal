import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** GET /feed/deals.json: headers, caching and refusals, with the live
 *  listing faked. The feed's content is covered in dealFeed.test.ts. */

let launched = true;
let listing: () => Promise<any[]> = async () => [];
vi.mock("./siteConfig", async (orig) => ({
  ...(await orig<typeof import("./siteConfig")>()),
  get SITE_LAUNCHED() {
    return launched;
  },
  get DEALS_OPEN() {
    return launched;
  },
}));
vi.mock("./fetchDealServer", () => ({ fetchAllLiveDealsServer: () => listing() }));
// Requests counted per address (T247), without a database.
const counts = new Map<string, number>();
vi.mock("./rateLimit", () => ({
  getClientIp: (req: NextRequest) => req.headers.get("cf-connecting-ip") || "unknown",
  checkRateLimit: async (key: string, max: number) => {
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return { limited: n > max };
  },
}));

const deal = {
  id: "d1", slug: "two-course-dinner", name: "Two-course dinner", description: "<p>Mains.</p>", image: null, now: 49, was: 80,
  formattedNow: null, formattedWas: null, discountPercent: 39, currency: "NZD", ribbon: null, categories: ["Food & Drink"],
  variantId: null, inStock: true, quantityAvailable: null, expiresAt: "2026-11-05T10:30:00.000Z", startsAt: "2026-10-20T19:00:00.000Z",
  status: "Live", isFlash: false, terms: null, businessName: "Bistro", businessCity: "Auckland", businessSlug: "bistro",
  businessAddressHidden: false, dealCode: "MEGA-SECRT", tags: [],
};

async function get(query = "", headers: Record<string, string> = {}) {
  const { GET } = await import("@/app/feed/deals.json/route");
  return GET(new NextRequest(`http://localhost/feed/deals.json${query}`, { headers }));
}

beforeEach(() => {
  counts.clear();
  launched = true;
  listing = async () => [deal];
});

describe("GET /feed/deals.json", () => {
  it("is public JSON, open to other sites, cacheable for a minute, and kept out of search results", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cache-control")).toMatch(/public, max-age=0, must-revalidate/);
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("link")).toMatch(/openapi\.json>; rel="describedby"/);
    const body = await res.json();
    expect(body.deals).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("MEGA-SECRT");
  });

  it("answers 304 to a client that already has this version, and 200 once it changes", async () => {
    const etag = (await get()).headers.get("etag")!;
    expect(etag).toMatch(/^W\/"[0-9a-f]{32}"$/);
    expect((await get("", { "if-none-match": etag })).status).toBe(304);
    listing = async () => [{ ...deal, now: 45 }];
    expect((await get("", { "if-none-match": etag })).status).toBe(200);
  });

  it("refuses a filter it doesn't understand, with a 400 that says why", async () => {
    const res = await get("?city=sydney");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown city/);
  });

  it("has no deals before launch, and doesn't read them", async () => {
    launched = false;
    listing = async () => {
      throw new Error("read before launch");
    };
    const body = await (await get()).json();
    expect(body).toMatchObject({ launched: false, total: 0, deals: [] });
  });

  it("is unavailable (503, try again shortly) when the listing can't be read", async () => {
    listing = async () => {
      throw new Error("database down");
    };
    const res = await get();
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("ignores tracking parameters but still refuses unknown filters (T247)", async () => {
    const plain = await (await get()).json();
    const tracked = await get("?utm_source=x&utm_medium=social&fbclid=y&gclid=z&ref=a&_=123");
    expect(tracked.status).toBe(200);
    const body = await tracked.json();
    expect({ ...body, generated_at: 0 }).toEqual({ ...plain, generated_at: 0 });
    expect((await get("?colour=red")).status).toBe(400);
  });

  it("says outright whether it's the pre-launch period and the deals can be used (T247)", async () => {
    const body = await (await get()).json();
    expect(body).toMatchObject({ launched: true, prelaunch: false, redeemable: true });
    launched = false;
    expect(await (await get()).json()).toMatchObject({ launched: false, redeemable: false });
  });

  it("answers 429 after 120 requests a minute from one address, not from others (T247)", async () => {
    const from = (ip: string) => get("", { "cf-connecting-ip": ip });
    for (let i = 0; i < 120; i++) expect((await from("9.9.9.9")).status).toBe(200);
    const over = await from("9.9.9.9");
    expect(over.status).toBe(429);
    expect(over.headers.get("Retry-After")).toBe("60");
    expect((await from("8.8.8.8")).status).toBe(200);
  });
});
