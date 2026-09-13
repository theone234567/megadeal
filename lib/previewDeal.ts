import type { Deal } from "./types";
import { businessSlug } from "./slug";

/**
 * Builds a Deal from the new-deal form so the merchant can be shown the
 * real card and the real deal page, rather than a summary of the fields
 * they just typed.
 *
 * The old preview listed the values back — useful for checking a typo,
 * useless for the question merchants actually have, which is "what will
 * this look like next to everyone else's?". Pre-launch that matters more
 * than usual: they can't visit the site and find their deal, so this is
 * the only evidence that signing up was worth anything.
 *
 * Nothing here is persisted. The id is a marker rather than a real id,
 * and DealDetail is told it is previewing so it doesn't record a view
 * against it.
 */
export const PREVIEW_DEAL_ID = "__preview__";

export interface PreviewInput {
  dealName: string;
  description: string;
  terms: string;
  category: string;
  priceNow: string;
  priceWas: string;
  quantityAvailable: string;
  isFlash: boolean;
  durationDays: number;
  durationMinutes: number;
  /** Blob URL for a newly picked file, or the media URL of one already
   *  uploaded — either renders identically. */
  imageUrl: string | null;
}

/** Comma-separated in the profile form, a list everywhere it's shown. */
function splitAmenities(value: unknown): string[] {
  return typeof value === "string"
    ? value.split(",").map((a) => a.trim()).filter(Boolean)
    : [];
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildPreviewDeal(input: PreviewInput, merchant: any): Deal {
  const now = toNumber(input.priceNow);
  const was = input.priceWas ? toNumber(input.priceWas) : now;
  const quantity = input.quantityAvailable ? toNumber(input.quantityAvailable) : null;

  const expiresAt = new Date(
    Date.now() +
      (input.isFlash ? input.durationMinutes * 60_000 : input.durationDays * 86_400_000)
  ).toISOString();

  return {
    id: PREVIEW_DEAL_ID,
    slug: PREVIEW_DEAL_ID,
    name: input.dealName,
    // The public page renders this as the deal's copy and shows terms
    // beneath it, same as a real listing.
    description: input.description,
    image: input.imageUrl,
    now,
    was,
    formattedNow: null,
    formattedWas: null,
    discountPercent: was > now ? Math.round(((was - now) / was) * 100) : 0,
    currency: "NZD",
    ribbon: null,
    categories: input.category ? [input.category] : [],
    variantId: null,
    // A deal being written is not sold out, whatever quantity says.
    inStock: true,
    quantityAvailable: quantity,
    expiresAt,
    status: "Pending Approval",
    isFlash: input.isFlash,
    terms: input.terms || null,

    // Everything below comes from the business profile, exactly as it
    // will on the live page — which is also the point: a merchant who
    // hasn't filled in a booking link finds out here, not after approval.
    businessName: merchant?.businessName ?? null,
    businessLogoUrl: merchant?.logoUrl ?? null,
    businessWebsite: merchant?.website ?? null,
    businessPhone: merchant?.phone ?? null,
    businessAddress: merchant?.address ?? null,
    businessCity: merchant?.city ?? null,
    // Derived the same way the live page does, so the "more from this
    // business" link points where it really will rather than vanishing
    // from the preview.
    businessSlug:
      merchant?.businessName && merchant?._id
        ? businessSlug(merchant.businessName, merchant._id)
        : null,
    businessBio: merchant?.bio ?? null,
    businessHours: merchant?.businessHours ?? null,
    businessFacebookUrl: merchant?.facebookUrl ?? null,
    businessInstagramUrl: merchant?.instagramUrl ?? null,
    businessPriceRange: merchant?.priceRange ?? null,
    businessAmenities: splitAmenities(merchant?.amenities),
    businessBookingUrl: merchant?.bookingUrl ?? null,
    businessBookingEmail: merchant?.bookingEmail ?? null,
    businessLat: typeof merchant?.lat === "number" ? merchant.lat : null,
    businessLng: typeof merchant?.lng === "number" ? merchant.lng : null,
    // Genuinely absent rather than omitted: ratings are set by us after a
    // business has been reviewed, so a deal being written has none, and
    // showing a made-up one here would be the worst kind of preview.
    businessRating: typeof merchant?.rating === "number" ? merchant.rating : null,
    businessReviewCount:
      typeof merchant?.reviewCount === "number" ? merchant.reviewCount : null,
    dealCode: null,
  };
}
