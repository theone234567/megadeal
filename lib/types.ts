import type { BookingRequirement } from "./booking";

/**
 * "Draft" is a deal the merchant is still writing: saved server-side, but
 * with no Wix Stores product behind it and no credit spent. That absence
 * is what keeps it off the storefront — every public read starts from a
 * product and joins Deals by productId, so a draft has nothing to be
 * found by. It is not a filter anyone can forget to apply.
 */
export type DealStatus = "Draft" | "Pending Approval" | "Live" | "Paused" | "Cancelled";

export interface Deal {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  now: number;
  was: number;
  formattedNow: string | null;
  formattedWas: string | null;
  discountPercent: number;
  currency: string;
  ribbon: string | null;
  categories: string[];
  variantId: string | null;
  inStock: boolean;
  quantityAvailable: number | null;
  expiresAt: string | null;
  /** When it went (or, for a scheduled deal, goes) public: the Deals
   *  row's firstPublishedAt. Not public before then (isDealLive). */
  startsAt?: string | null;
  status: DealStatus | null;
  isFlash: boolean;
  /** The merchant's fine print. Collected since deals began and stored on
   *  the Deals row, but never mapped onto a Deal and never rendered — so
   *  every condition a merchant set was invisible to the customer it was
   *  meant to inform, and the first they'd hear of "bookings essential"
   *  was being turned away at the door. */
  terms: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  businessWebsite: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  /** Home-based or mobile: the street is private (businessAddress is
   *  null), there are no directions, and the pin is approximate. */
  businessAddressHidden?: boolean;
  /** The area a mobile business covers. */
  businessServiceArea?: string | null;
  /** The city filter ("All areas") matches on this, so it stays the city. */
  businessCity: string | null;
  /** Suburb, when known (lib/location.ts). */
  businessSuburb: string | null;
  businessSlug: string | null;
  businessBio: string | null;
  /** The business's profile photos (lib/businessPhotos.ts), shown on its
   *  deal pages. Left off listings (lib/listingDeal.ts). */
  businessPhotos?: string[];
  businessHours: string | null;
  businessFacebookUrl: string | null;
  businessInstagramUrl: string | null;
  businessPriceRange: string | null;
  businessAmenities: string[];
  businessBookingUrl: string | null;
  businessBookingEmail: string | null;
  businessLat: number | null;
  businessLng: number | null;
  businessRating: number | null;
  businessReviewCount: number | null;
  dealCode: string | null;
  /** Whether the customer must book to use this deal — see lib/booking.ts.
   *  "unknown" for deals written before the field existed. */
  bookingRequirement: BookingRequirement;
  /** The business confirmed customers enter its own code on its website,
   *  at `codeWebsiteUrl`. Undefined/null on deals from before this was
   *  asked (lib/booking.ts keeps their old wording). */
  codeOnWebsite?: boolean | null;
  codeWebsiteUrl?: string | null;
  /** An admin test deal (lib/testDeals.ts): never in Wix, shown only on
   *  admin previews, linking to its private page. */
  isTest?: boolean;

  // Provenance (supabase/migrations/20261017000000_deal_provenance.sql,
  // lib/dealVerification.ts). Optional: previews and examples have none.
  /** When anything a customer sees on the deal last changed. */
  updatedAt?: string | null;
  /** When MegaDeal last approved what the deal says. */
  approvedAt?: string | null;
  /** When the business last confirmed it's still running as listed. */
  merchantConfirmedAt?: string | null;
  /** Who put the deal on MegaDeal. */
  source?: "merchant" | "admin" | "community";
  /** From lib/dealTags.ts only. */
  tags?: string[];
  /** The business's owner has a login linked to it. */
  businessClaimed?: boolean;
  /** When MegaDeal first approved the business. */
  businessApprovedAt?: string | null;
}
