import { businessSlug } from "./slug";
import { parseBusinessPhotos } from "./businessPhotos";
import { businessSuburb, publicLocation } from "./location";
import type { Deal } from "./types";

/**
 * The public-safe projection of a Merchants record, used by the server-side
 * deal, listing and business-profile reads (lib/fetchDealServer.ts).
 * Deliberately excludes email, postcode, coupon/referral code, credits
 * balance, and status — none of those are ever shown to customers.
 */
export interface PublicBusiness {
  businessName: string;
  logoUrl: string | null;
  photos: string[];
  website: string | null;
  phone: string | null;
  /** Null when the business keeps it private (addressHidden). */
  address: string | null;
  /** Home-based or mobile: no street, no directions, and lat/lng are
   *  rounded to about a kilometre (lib/location.ts publicLocation). */
  addressHidden: boolean;
  /** The area a mobile business covers, in its own words. */
  serviceArea: string | null;
  city: string | null;
  /** Saved with the address, or read out of it (lib/location.ts). */
  suburb: string | null;
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
  const place = publicLocation(merchant);
  return {
    businessName: merchant.businessName,
    logoUrl: merchant.logoUrl || null,
    photos: parseBusinessPhotos(merchant.photos),
    website: merchant.website || null,
    phone: merchant.phone || null,
    address: place.address,
    addressHidden: place.addressHidden,
    serviceArea: merchant.serviceArea || null,
    city: merchant.city || null,
    suburb: businessSuburb(merchant.suburb, merchant.address, merchant.city),
    // Stored on MegaDeal's own database; made from the Wix id before.
    slug: merchant.slug || businessSlug(merchant.businessName, merchant._id),
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
    lat: place.lat,
    lng: place.lng,
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
    businessAddressHidden: business.addressHidden,
    businessServiceArea: business.serviceArea,
    businessCity: business.city,
    businessSuburb: business.suburb,
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
