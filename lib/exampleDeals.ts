import { renderTerms } from "./dealTerms";
import type { Deal } from "./types";

/**
 * Example deals for the marketing pages, shown with the real DealCard (in
 * its non-linking preview mode) so they look exactly like a deal on the
 * site and can't drift from the real card. Example details on AI-generated
 * illustrative photos (MegaDeal Website Images pack): never a real
 * business or a live, redeemable offer — "Your business" stands in for
 * the merchant.
 */
function exampleDeal(fields: Partial<Deal> & Pick<Deal, "id" | "name" | "image" | "now" | "was" | "categories">): Deal {
  return {
    slug: fields.id,
    description: "",
    formattedNow: null,
    formattedWas: null,
    discountPercent: 0,
    currency: "NZD",
    ribbon: null,
    variantId: null,
    inStock: true,
    quantityAvailable: null,
    expiresAt: null,
    status: "Live",
    isFlash: false,
    terms: null,
    businessName: "Your business",
    businessLogoUrl: null,
    businessWebsite: null,
    businessPhone: null,
    businessAddress: null,
    businessCity: "Auckland",
    businessSuburb: null,
    businessSlug: null,
    businessBio: null,
    businessHours: null,
    businessFacebookUrl: null,
    businessInstagramUrl: null,
    businessPriceRange: null,
    businessAmenities: [],
    businessBookingUrl: null,
    businessBookingEmail: null,
    businessLat: null,
    businessLng: null,
    businessRating: null,
    businessReviewCount: null,
    dealCode: null,
    bookingRequirement: "unknown",
    ...fields,
  };
}

/** /list-your-business hero. */
export const EXAMPLE_BURGER_DEAL = exampleDeal({
  id: "example-burger",
  name: "Gourmet burger & fries for two",
  image: "/megadeal-coming-soon/food-drink-v1.webp",
  now: 29,
  was: 48,
  categories: ["Food & Drink"],
  terms: renderTerms(["mon-thu", "dine-in"], ""),
});

/** Coming soon, "How it works". */
export const EXAMPLE_MASSAGE_DEAL = exampleDeal({
  id: "example-massage",
  name: "60-minute relaxation massage",
  image: "/megadeal-coming-soon/example-massage-v1.webp",
  now: 49,
  was: 79,
  categories: ["Beauty & Spa"],
  terms: renderTerms(["mon-thu", "bookings"], ""),
  bookingRequirement: "required",
});
