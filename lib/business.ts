import { businessSlug } from "./slug";
import type { Deal } from "./types";

/**
 * The public-safe projection of a Merchants record — shared shape between
 * the merchant-directory API route, the client-side deal fetch path
 * (lib/fetchDeals.ts), and the server-only SEO/business-profile paths
 * (lib/fetchDealServer.ts). Deliberately excludes email, postcode,
 * coupon/referral code, credits balance, and status — none of those are
 * ever shown to customers.
 */
export interface PublicBusiness {
  businessName: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  slug: string;
  bio: string | null;
  businessHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  priceRange: string | null;
  amenities: string[];
  bookingUrl: string | null;
  bookingEmail: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
}

/** Maps a raw Wix "Merchants" data item to the public-safe shape. Caller
 * must have already checked `merchant.businessName` and `merchant._id`. */
export function mapMerchantToBusiness(merchant: any): PublicBusiness {
  return {
    businessName: merchant.businessName,
    logoUrl: merchant.logoUrl || null,
    website: merchant.website || null,
    phone: merchant.phone || null,
    address: merchant.address || null,
    city: merchant.city || null,
    slug: businessSlug(merchant.businessName, merchant._id),
    bio: merchant.bio || null,
    businessHours: merchant.businessHours || null,
    facebookUrl: merchant.facebookUrl || null,
    instagramUrl: merchant.instagramUrl || null,
    priceRange: merchant.priceRange || null,
    amenities: String(merchant.amenities || "")
      .split(",")
      .map((a: string) => a.trim())
      .filter(Boolean),
    bookingUrl: merchant.bookingUrl || null,
    bookingEmail: merchant.bookingEmail || null,
    lat: typeof merchant.lat === "number" ? merchant.lat : null,
    lng: typeof merchant.lng === "number" ? merchant.lng : null,
    rating: typeof merchant.rating === "number" ? merchant.rating : null,
    reviewCount: typeof merchant.reviewCount === "number" ? merchant.reviewCount : null,
  };
}

/** Spreads a business' public-safe fields onto a deal's `business*` fields. */
export function applyBusinessToDeal<T extends Deal>(deal: T, business: PublicBusiness): T {
  return {
    ...deal,
    businessName: business.businessName,
    businessLogoUrl: business.logoUrl,
    businessWebsite: business.website,
    businessPhone: business.phone,
    businessAddress: business.address,
    businessCity: business.city,
    businessSlug: business.slug,
    businessBio: business.bio,
    businessHours: business.businessHours,
    businessFacebookUrl: business.facebookUrl,
    businessInstagramUrl: business.instagramUrl,
    businessPriceRange: business.priceRange,
    businessAmenities: business.amenities,
    businessBookingUrl: business.bookingUrl,
    businessBookingEmail: business.bookingEmail,
    businessLat: business.lat,
    businessLng: business.lng,
    businessRating: business.rating,
    businessReviewCount: business.reviewCount,
  };
}
