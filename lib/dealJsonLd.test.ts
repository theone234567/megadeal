import { describe, expect, it } from "vitest";
import { dealJsonLd } from "./dealJsonLd";
import type { Deal } from "./types";

/**
 * The deal page's structured data (lib/dealJsonLd.ts) against what
 * Google's Rich Results Test checks for Product snippets and merchant
 * listings, and what makes it trustworthy for anything reading it:
 * absolute links, real dates, no empty values, no private details.
 * https://developers.google.com/search/docs/appearance/structured-data/product-snippet
 */

const SITE = "https://megadeal.co.nz";

const deal: Deal = {
  id: "8d1c3a52-5b7e-4f0a-9d1e-2b3c4d5e6f70",
  slug: "two-course-dinner",
  name: "Two-course dinner for two",
  description: "<p>Any main and dessert.</p>",
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
  businessBookingEmail: null,
  businessLat: -36.84,
  businessLng: 174.77,
  businessRating: 4.6,
  businessReviewCount: 120,
  dealCode: "MEGA-7K4XQ",
  bookingRequirement: "recommended",
  codeOnWebsite: false,
  updatedAt: "2026-10-21T02:00:00.000Z",
  approvedAt: "2026-10-20T18:30:00.000Z",
  merchantConfirmedAt: "2026-10-25T01:00:00.000Z",
  source: "merchant",
  tags: ["date-night"],
  businessClaimed: true,
  businessApprovedAt: "2026-10-01T00:00:00.000Z",
};

const graph = (d: Deal = deal) => dealJsonLd(d, SITE)["@graph"] as any[];
const node = (type: string, d?: Deal) => graph(d).find((n) => n["@type"] === type);

/** Every value in the data, with its path, to check them all at once. */
function walk(value: unknown, path = "$", out: [string, unknown][] = []): [string, unknown][] {
  out.push([path, value]);
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, out);
  return out;
}

describe("Google's Product snippet requirements", () => {
  it("has a Product with a name and an Offer with price, currency and availability", () => {
    const p = node("Product");
    expect(p.name).toBe("Two-course dinner for two");
    expect(p.offers).toMatchObject({ "@type": "Offer", price: 49, priceCurrency: "NZD", availability: "https://schema.org/InStock" });
    expect(p.offers.price).toBeGreaterThan(0);
  });

  it("gives the recommended image, description, url and price-valid-until date", () => {
    const p = node("Product");
    expect(p.image).toEqual(["https://megadeal.co.nz/media/photos/2026-10/dinner.jpg"]);
    expect(p.description).toBe("Any main and dessert.");
    expect(p.offers.url).toBe(`${SITE}/deal/two-course-dinner`);
    // A date, the deal's last day in New Zealand.
    expect(p.offers.priceValidUntil).toBe("2026-11-05");
  });

  it("lists every photo, the main one first", () => {
    const withGallery = { ...deal, gallery: ["https://megadeal.co.nz/media/photos/2026-10/room.jpg"] };
    expect(node("Product", withGallery).image).toEqual([deal.image, "https://megadeal.co.nz/media/photos/2026-10/room.jpg"]);
  });

  it("carries the usual price as a strikethrough price", () => {
    const spec = node("Product").offers.priceSpecification;
    expect(spec[1]).toMatchObject({ priceType: "https://schema.org/StrikethroughPrice", price: 80, priceCurrency: "NZD" });
  });

  it("has no ratings: MegaDeal doesn't collect its own reviews yet", () => {
    const text = JSON.stringify(dealJsonLd(deal, SITE));
    expect(text).not.toMatch(/AggregateRating|"review"/i);
  });
});

describe("what a deal is, when and where", () => {
  it("runs from when it went public to when it ends", () => {
    expect(node("Product").offers).toMatchObject({ validFrom: deal.startsAt, validThrough: deal.expiresAt });
  });

  it("applies in its city, region and country", () => {
    expect(node("Product").offers.areaServed).toEqual({
      "@type": "City",
      name: "Auckland",
      containedInPlace: { "@type": "AdministrativeArea", name: "Auckland", containedInPlace: { "@type": "Country", name: "New Zealand", identifier: "NZ" } },
    });
    expect(node("Product").offers.eligibleRegion).toMatchObject({ identifier: "NZ" });
  });

  it("says how many are left when there's a limit, and its category and tags", () => {
    const p = node("Product");
    expect(p.offers.inventoryLevel).toEqual({ "@type": "QuantitativeValue", value: 20 });
    expect(p).toMatchObject({ sku: deal.id, category: "Food & Drink", keywords: "Date night" });
  });

  it("says how to redeem, who checked it and the conditions", () => {
    const props = Object.fromEntries(node("Product").additionalProperty.map((p: any) => [p.name, p.value]));
    expect(props.Booking).toBe("recommended");
    expect(props["How to redeem"]).toMatch(/deal code on the deal page: https:\/\/megadeal\.co\.nz\/deal\/two-course-dinner.*Pay the business directly/);
    expect(props.Verification).toBe("Business verified");
    expect(props.Conditions).toBe("Dine-in only.");
  });

  it("the page says when it last changed and was last checked", () => {
    expect(node("WebPage")).toMatchObject({
      dateModified: deal.updatedAt,
      datePublished: deal.startsAt,
      lastReviewed: deal.merchantConfirmedAt,
      mainEntity: { "@id": `${SITE}/deal/two-course-dinner#deal` },
      isPartOf: { "@id": `${SITE}/#website` },
    });
  });
});

describe("the business", () => {
  it("is one LocalBusiness node, the Offer's seller by @id, linked to its own page", () => {
    const biz = node("LocalBusiness");
    expect(biz["@id"]).toBe(`${SITE}/business/harbour-bistro-auckland-cbd#business`);
    expect(node("Product").offers.seller).toEqual({ "@id": biz["@id"] });
    expect(biz.geo).toEqual({ "@type": "GeoCoordinates", latitude: -36.84, longitude: 174.77 });
  });

  it("keeps a home-based business's street and pin out", () => {
    const home = { ...deal, businessAddress: null, businessAddressHidden: true, businessServiceArea: "North Shore" };
    const biz = node("LocalBusiness", home);
    expect(biz.address.streetAddress).toBeUndefined();
    expect(biz.geo).toBeUndefined();
    expect(biz.areaServed).toBe("North Shore");
  });
});

describe("clean data", () => {
  it("has no empty values, and every link is an absolute https address", () => {
    for (const [path, v] of walk(dealJsonLd(deal, SITE))) {
      expect(v, path).not.toBeNull();
      expect(v, path).not.toBe("");
      if (typeof v === "string" && /(^|\.)(url|@id|image|availability|priceType)$|image\[\d+\]$/.test(path)) expect(v, path).toMatch(/^https:\/\//);
    }
  });

  it("every date is a full ISO time or, for priceValidUntil, a date", () => {
    for (const [path, v] of walk(dealJsonLd(deal, SITE))) {
      if (/(validFrom|validThrough|datePublished|dateModified|lastReviewed)$/.test(path)) expect(String(v), path).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it("a deal without a limit, photo, tags or checks leaves those out rather than empty", () => {
    const bare = { ...deal, quantityAvailable: null, image: null, tags: [], terms: null, approvedAt: null, merchantConfirmedAt: null };
    const p = node("Product", bare);
    expect(p.offers.inventoryLevel).toBeUndefined();
    expect(p.image).toBeUndefined();
    expect(p.keywords).toBeUndefined();
    expect(node("WebPage", bare).lastReviewed).toBeUndefined();
  });
});
