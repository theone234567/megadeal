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
  status: DealStatus | null;
  isFlash: boolean;
  businessName: string | null;
  businessLogoUrl: string | null;
  businessWebsite: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessSlug: string | null;
  businessBio: string | null;
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
}
