import { effectiveBookingRequirement, type BookingRequirement } from "./booking";
import type { Deal } from "./types";

/**
 * How a customer uses a deal, in one consistent set of words for the
 * structured data and the public feed (lib/dealJsonLd.ts,
 * lib/dealFeed.ts). MegaDeal never takes payment: the customer gets the
 * deal's code on its page and pays the business directly.
 */
export interface DealRedemption {
  /** "website-code": entered as a promo code on the business's website.
   *  "show-code": shown or quoted to the business when booking or paying. */
  method: "website-code" | "show-code";
  booking: BookingRequirement;
  /** Plain-English steps, one sentence each. */
  steps: string[];
}

const BOOKING_STEP: Record<BookingRequirement, string> = {
  required: "Book with the business before you go: booking is required.",
  recommended: "Booking with the business is recommended.",
  not_required: "No booking needed: just turn up.",
  unknown: "Check with the business whether you need to book.",
};

export function dealRedemption(deal: Pick<Deal, "bookingRequirement" | "terms" | "codeOnWebsite" | "slug">, siteUrl: string): DealRedemption {
  const booking = effectiveBookingRequirement(deal.bookingRequirement, deal.terms);
  const method = deal.codeOnWebsite ? "website-code" : "show-code";
  return {
    method,
    booking,
    steps: [
      `Get the free deal code on the deal page: ${siteUrl}/deal/${deal.slug}`,
      BOOKING_STEP[booking],
      method === "website-code"
        ? "Enter the code at checkout on the business's website."
        : "Quote or show the code when you book or pay.",
      "Pay the business directly. MegaDeal never takes payment.",
    ],
  };
}
