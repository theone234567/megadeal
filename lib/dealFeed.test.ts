import { describe, expect, it } from "vitest";
import { buildFeed, feedDeal, parseFeedFilters, FEED_MAX_LIMIT, type FeedFilters } from "./dealFeed";
import type { Deal } from "./types";

/** The public deals feed (/feed/deals.json): what it shares, what it never
 *  shares, and how its filters read. */

const SITE = "https://megadeal.co.nz";
const opts = { siteUrl: SITE, siteName: "MegaDeal", launched: true };
const all: FeedFilters = { limit: FEED_MAX_LIMIT, offset: 0 };

const base: Deal = {
  id: "8d1c3a52-5b7e-4f0a-9d1e-2b3c4d5e6f70",
  slug: "two-course-dinner",
  name: "Two-course dinner for two",
  description: "<p>Any main &amp; dessert.</p>",
  image: "https://megadeal.co.nz/media/photos/2026-10/dinner.jpg",
  now: 49,
  was: 80,
  formattedNow: null,
  formattedWas: null,
  discountPercent: 39,
  currency: "NZD",
  ribbon: null,
  categories: ["Food & Drink"],
  variantId: null,
  inStock: true,
  quantityAvailable: 20,
  expiresAt: "2026-11-05T10:30:00.000Z",
  startsAt: "2026-10-20T19:00:00.000Z",
  status: "Live",
  isFlash: false,
  terms: "Dine-in only.",
  businessName: "Harbour Bistro",
  businessLogoUrl: null,
  businessWebsite: "https://harbourbistro.co.nz",
  businessPhone: "09 123 4567",
  businessAddress: "1 Quay Street",
  businessAddressHidden: false,
  businessServiceArea: null,
  businessCity: "Auckland",
  businessSuburb: "Auckland CBD",
  businessSlug: "harbour-bistro-auckland-cbd",
  businessBio: null,
  businessHours: null,
  businessFacebookUrl: null,
  businessInstagramUrl: null,
  businessPriceRange: null,
  businessAmenities: [],
  businessBookingUrl: null,
  businessBookingEmail: "bookings@harbourbistro.co.nz",
  businessLat: -36.84,
  businessLng: 174.77,
  businessRating: 4.6,
  businessReviewCount: 120,
  dealCode: "MEGA-7K4XQ",
  bookingRequirement: "recommended",
  codeOnWebsite: false,
  updatedAt: "2026-10-21T02:00:00.000Z",
  approvedAt: "2026-10-20T18:30:00.000Z",
  merchantConfirmedAt: null,
  source: "merchant",
  tags: ["date-night"],
  businessClaimed: true,
  businessApprovedAt: "2026-10-01T00:00:00.000Z",
};

const spa: Deal = {
  ...base,
  id: "11111111-2222-4333-8444-555555555555",
  slug: "massage",
  name: "60-minute massage",
  categories: ["Beauty & Spa"],
  isFlash: true,
  expiresAt: "2026-10-22T05:00:00.000Z",
  tags: ["new-customers-only"],
  businessCity: "Wellington",
  businessName: "Calm Spa",
  businessAddress: null,
  businessAddressHidden: true,
  businessServiceArea: "Te Aro",
};

const filters = (q: string) => {
  const r = parseFeedFilters(new URLSearchParams(q));
  if (!r.ok) throw new Error(r.error);
  return r.filters;
};

describe("each deal", () => {
  it("has the price, dates, category, tags, business and how to redeem", () => {
    expect(feedDeal(base, SITE)).toMatchObject({
      id: base.id,
      url: `${SITE}/deal/two-course-dinner`,
      title: "Two-course dinner for two",
      description: "Any main & dessert.",
      type: "everyday",
      price: { amount: 49, original_amount: 80, discount_percent: 39, currency: "NZD" },
      category: { slug: "food-drink", name: "Food & Drink", url: `${SITE}/auckland/food-drink` },
      tags: [{ id: "date-night", label: "Date night" }],
      starts_at: base.startsAt,
      expires_at: base.expiresAt,
      quantity_available: 20,
      redemption: { method: "show-code", booking: "recommended" },
      business: { name: "Harbour Bistro", url: `${SITE}/business/harbour-bistro-auckland-cbd`, city: "Auckland", region: "Auckland", country: "NZ", geo: { lat: -36.84, lng: 174.77 } },
      verification: { status: "merchant-verified", label: "Business verified", business_claimed: true, approved_at: base.approvedAt, last_checked_at: base.approvedAt },
      updated_at: base.updatedAt,
    });
  });

  it("never includes the deal code or any email address", () => {
    const text = JSON.stringify(buildFeed([base, spa], all, opts));
    expect(text).not.toContain("MEGA-7K4XQ");
    expect(text).not.toMatch(/dealCode|deal_code/i);
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]/i);
  });

  it("keeps a business's hidden street address and pin out", () => {
    const b = feedDeal(spa, SITE).business;
    expect(b).toMatchObject({ address: null, address_hidden: true, geo: null, service_area: "Te Aro" });
    expect(JSON.stringify(feedDeal({ ...spa, businessAddress: "9 Secret Lane" }, SITE))).not.toContain("Secret Lane");
  });

  it("says null, not a made-up number, when there's no usual price or limit", () => {
    const d = feedDeal({ ...base, was: 49, quantityAvailable: null }, SITE);
    expect(d.price).toEqual({ amount: 49, original_amount: null, discount_percent: null, currency: "NZD" });
    expect(d.quantity_available).toBeNull();
  });
});

describe("filters", () => {
  const titles = (q: string) => buildFeed([base, spa], filters(q), opts).deals.map((d) => d.title);

  it("by city, category, tag and type", () => {
    expect(titles("city=wellington")).toEqual(["60-minute massage"]);
    expect(titles("city=Auckland")).toEqual(["Two-course dinner for two"]);
    expect(titles("category=food-drink")).toEqual(["Two-course dinner for two"]);
    expect(titles("tag=new-customers-only")).toEqual(["60-minute massage"]);
    expect(titles("type=flash")).toEqual(["60-minute massage"]);
    expect(titles("city=auckland&category=beauty-spa")).toEqual([]);
  });

  it("by end date, read as a whole day in New Zealand", () => {
    // 5 November 2026 ends at 23:59:59.999 NZDT = 10:59:59.999 UTC.
    expect(filters("expires_before=2026-11-05").expiresBefore).toBe(Date.parse("2026-11-05T10:59:59.999Z"));
    expect(filters("expires_after=2026-11-05").expiresAfter).toBe(Date.parse("2026-11-04T11:00:00.000Z"));
    // In winter New Zealand is 12 hours ahead, not 13.
    expect(filters("expires_after=2026-07-01").expiresAfter).toBe(Date.parse("2026-06-30T12:00:00.000Z"));
    expect(titles("expires_before=2026-10-31")).toEqual(["60-minute massage"]);
    expect(titles("expires_after=2026-10-31")).toEqual(["Two-course dinner for two"]);
    expect(titles("expires_after=2026-10-22T05:00:00Z")).toEqual(["60-minute massage", "Two-course dinner for two"]);
  });

  it("soonest-ending first, with paging and a total", () => {
    const feed = buildFeed([base, spa], filters("limit=1&offset=1"), opts);
    expect(feed).toMatchObject({ total: 2, count: 1 });
    expect(feed.deals[0].title).toBe("Two-course dinner for two");
  });

  it("refuses what it doesn't understand, saying what it accepts", () => {
    const err = (q: string) => {
      const r = parseFeedFilters(new URLSearchParams(q));
      return r.ok ? null : r.error;
    };
    expect(err("city=sydney")).toMatch(/Unknown city.*auckland/);
    expect(err("category=pets")).toMatch(/food-drink/);
    expect(err("tag=cheap")).toMatch(/date-night/);
    expect(err("type=weekly")).toMatch(/flash/);
    expect(err("expires_before=next-week")).toMatch(/date/);
    expect(err("limit=0")).toMatch(/limit/);
    expect(err(`limit=${FEED_MAX_LIMIT + 1}`)).toMatch(/limit/);
    expect(err("ctiy=auckland")).toMatch(/Unknown parameter "ctiy"/);
  });
});

describe("the feed", () => {
  it("says who publishes it, its terms, docs and schema", () => {
    const feed = buildFeed([base], all, opts);
    expect(feed).toMatchObject({
      version: "1.0.0",
      publisher: { name: "MegaDeal", url: SITE },
      docs: `${SITE}/developers`,
      schema: `${SITE}/feed/openapi.json`,
      country: "NZ",
      currency: "NZD",
      launched: true,
      updated_at: base.updatedAt,
    });
    expect(feed.terms).toMatch(/link back/);
  });

  it("has no deals before launch, and says so", () => {
    const feed = buildFeed([base], all, { ...opts, launched: false });
    expect(feed).toMatchObject({ launched: false, total: 0, count: 0, deals: [] });
    expect(feed.message).toMatch(/hasn't launched/);
  });
});
