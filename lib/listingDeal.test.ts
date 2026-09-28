import { describe, expect, it } from "vitest";
import { toListingDeal } from "./listingDeal";
import type { Deal } from "./types";

const full: Deal = {
  id: "d1", slug: "pizza-for-two", name: "Pizza for two", description: "Two pizzas", image: "/p.webp",
  now: 49, was: 78, formattedNow: null, formattedWas: null, discountPercent: 37, currency: "NZD",
  ribbon: "Hot", categories: ["Food & Drink"], variantId: "v1", inStock: true, quantityAvailable: 10,
  expiresAt: "2030-01-01T00:00:00Z", status: "Live", isFlash: true, terms: "Dine-in only.",
  businessName: "Harbour & Hearth", businessLogoUrl: "/logo.webp", businessWebsite: "example.com",
  businessPhone: "09 123 4567", businessAddress: "12 Example St", businessCity: "Takapuna",
  businessSlug: "harbour-hearth-abc", businessBio: "Bio", businessHours: "9-5",
  businessFacebookUrl: "facebook.com/x", businessInstagramUrl: "instagram.com/x", businessPriceRange: "$$",
  businessAmenities: ["Wifi"], businessBookingUrl: "https://example.com/book",
  businessBookingEmail: "book@example.com", businessLat: -36.8, businessLng: 174.7,
  businessRating: 4.5, businessReviewCount: 12, dealCode: "MEGA-49", bookingRequirement: "required",
};

describe("toListingDeal", () => {
  it("keeps what cards, search, filters, the map and related deals use", () => {
    const d = toListingDeal(full);
    for (const key of [
      "id", "slug", "name", "description", "image", "now", "was", "currency", "categories", "inStock",
      "quantityAvailable", "expiresAt", "status", "isFlash", "terms", "businessName", "businessCity",
      "businessSlug", "businessLat", "businessLng",
    ] as const) {
      expect(d[key]).toEqual(full[key]);
    }
  });

  it("leaves off contact details and the deal code", () => {
    const d = toListingDeal(full);
    expect(d.businessPhone).toBeNull();
    expect(d.businessAddress).toBeNull();
    expect(d.businessBookingEmail).toBeNull();
    expect(d.businessBookingUrl).toBeNull();
    expect(d.businessWebsite).toBeNull();
    expect(d.dealCode).toBeNull();
    expect(JSON.stringify(d)).not.toMatch(/09 123 4567|book@example\.com|MEGA-49|12 Example St/);
  });
});
