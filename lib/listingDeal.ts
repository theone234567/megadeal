import type { Deal } from "./types";
import { htmlToText } from "./htmlText";
import { dealSearchText } from "./dealSearch";

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
    businessPhotos: [],
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
    businessPreferredContact: null,
    contactOverride: null,
    customerInstructions: null,
  };
}

/** Longest description a card-list keeps. The search box reads the card's
 *  searchText (lib/dealSearch.ts), which covers the whole description. */
export const CARD_DESCRIPTION_CHARS = 300;

/**
 * A deal as it's handed to the browser in a list of cards (the homepage,
 * category and flash pages): a listing deal with its description cut to
 * plain text of CARD_DESCRIPTION_CHARS (search reads it; no card shows it)
 * and none of the deal page's own extras (photos, tags, checks). With hundreds of
 * deals these made up most of each listing page's size. The deal page,
 * the feed and the structured data use the full deal.
 */
export function toCardDeal(deal: Deal): Deal {
  // Shown on the deal page only, so left off each card. Removed rather
  // than set to undefined: a page's data still spells out undefined fields.
  const {
    gallery: _gallery,
    tags: _tags,
    updatedAt: _updatedAt,
    approvedAt: _approvedAt,
    merchantConfirmedAt: _confirmed,
    source: _source,
    businessClaimed: _claimed,
    businessApprovedAt: _bizApproved,
    businessPreferredContact: _preferred,
    contactOverride: _override,
    customerInstructions: _instructions,
    ...card
  } = toListingDeal(deal);
  return {
    ...card,
    description: htmlToText(deal.description).slice(0, CARD_DESCRIPTION_CHARS),
    // From the full deal, before anything above was left off.
    searchText: dealSearchText(deal),
  };
}
