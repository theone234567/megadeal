import { describe, expect, it } from "vitest";
import { buildFeed, feedDeal, FEED_MAX_LIMIT } from "./dealFeed";
import { feedOpenApi } from "./feedOpenApi";
import type { Deal } from "./types";

/** The OpenAPI description must cover everything the feed returns, so a
 *  field added to one without the other fails here. */

const SITE = "https://megadeal.co.nz";
const doc = feedOpenApi(SITE, "MegaDeal") as any;

const deal = {
  id: "8d1c3a52-5b7e-4f0a-9d1e-2b3c4d5e6f70", slug: "x", name: "X", description: "<p>Y</p>", image: null, now: 10, was: 20,
  formattedNow: null, formattedWas: null, discountPercent: 50, currency: "NZD", ribbon: null, categories: ["Food & Drink"],
  variantId: null, inStock: true, quantityAvailable: 5, expiresAt: "2026-11-05T10:30:00.000Z", startsAt: "2026-10-20T19:00:00.000Z",
  status: "Live", isFlash: false, terms: "T", businessName: "B", businessLogoUrl: null, businessWebsite: null, businessPhone: null,
  businessAddress: "1 St", businessAddressHidden: false, businessServiceArea: null, businessCity: "Auckland", businessSuburb: "CBD",
  businessSlug: "b", businessBio: null, businessHours: null, businessFacebookUrl: null, businessInstagramUrl: null,
  businessPriceRange: null, businessAmenities: [], businessBookingUrl: null, businessBookingEmail: null, businessLat: -36.8,
  businessLng: 174.7, businessRating: null, businessReviewCount: null, dealCode: "MEGA-AAAAA", bookingRequirement: "required",
  codeOnWebsite: false, updatedAt: "2026-10-21T02:00:00.000Z", approvedAt: null, merchantConfirmedAt: null, source: "merchant",
  tags: ["kids"], businessClaimed: false,
} as Deal;

/** Every property path in a value whose schema says "object". */
function uncovered(value: any, schema: any, path: string, out: string[] = []): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    if (Array.isArray(value) && schema?.items) for (const v of value) uncovered(v, schema.items, `${path}[]`, out);
    return out;
  }
  for (const [k, v] of Object.entries(value)) {
    const s = schema?.properties?.[k];
    if (!s) out.push(`${path}.${k}`);
    else uncovered(v, s, `${path}.${k}`, out);
  }
  return out;
}

describe("feed OpenAPI", () => {
  it("is OpenAPI 3.1 for GET /feed/deals.json on the site", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.servers[0].url).toBe(SITE);
    expect(doc.paths["/feed/deals.json"].get.operationId).toBe("listDeals");
  });

  it("describes every field of a deal", () => {
    expect(uncovered(feedDeal(deal, SITE), doc.components.schemas.Deal, "deal")).toEqual([]);
  });

  it("describes every field of the response", () => {
    const feed = { generated_at: "x", ...buildFeed([deal], { limit: FEED_MAX_LIMIT, offset: 0 }, { siteUrl: SITE, siteName: "MegaDeal", launched: false }) };
    const top = Object.keys(feed).filter((k) => !doc.components.schemas.Feed.properties[k]);
    expect(top).toEqual([]);
  });

  it("lists exactly the filters the feed accepts", () => {
    const names = doc.paths["/feed/deals.json"].get.parameters.map((p: any) => p.name).sort();
    expect(names).toEqual(["category", "city", "expires_after", "expires_before", "limit", "offset", "tag", "type"]);
  });
});
