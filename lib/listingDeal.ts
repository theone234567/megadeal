import type { Deal } from "./types";

/**
 * A deal as the listings need it: the homepage, category pages, flash
 * deals and a deal page's "more deals" all hand the whole list to the
 * browser, so every field here is sent on every view of those pages.
 *
 * Only what a deal card, the search box, the distance filter and the map
 * read is kept. A business's phone, address, booking email, website, bio,
 * hours and the deal code are shown on the deal's own page, not on a card,
 * so they're left off: they only made each listing page heavier, and put
 * every deal code on one page, bypassing the "Get deal code" button whose
 * clicks businesses see in their stats.
 */
export function toListingDeal(deal: Deal): Deal {
  return {
    ...deal,
    variantId: null,
    ribbon: null,
    businessLogoUrl: null,
    businessWebsite: null,
    businessPhone: null,
    businessAddress: null,
    businessBio: null,
    businessHours: null,
    businessFacebookUrl: null,
    businessInstagramUrl: null,
    businessPriceRange: null,
    businessAmenities: [],
    businessBookingUrl: null,
    businessBookingEmail: null,
    businessRating: null,
    businessReviewCount: null,
    dealCode: null,
    bookingRequirement: "unknown",
  };
}
