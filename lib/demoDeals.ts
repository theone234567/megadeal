import type { Deal } from "./types";

/**
 * The homepage's demo deals before launch (app/PrelaunchHome.tsx): what a
 * MegaDeal listing will look like, with made-up businesses and prices.
 *
 * Fixed data in code, never from the database, so no business's real or
 * test deal ends up here. Each one is labelled DEMO on its card, has no
 * page, no code and no end date, and is left out of search, the results
 * count and every piece of structured data (the homepage renders them
 * separately from the real deals). The business names say "Example" so
 * none can be taken for a real participating business. Photos are the
 * site's own, so nothing loads from elsewhere.
 */
function demo(o: Pick<Deal, "id" | "name" | "businessName" | "businessSuburb" | "image" | "now" | "was"> & { category: string; flash?: boolean }): Deal {
  return {
    id: `demo-${o.id}`,
    slug: `demo-${o.id}`,
    name: o.name,
    description: "",
    image: o.image,
    now: o.now,
    was: o.was,
    formattedNow: null,
    formattedWas: null,
    discountPercent: Math.round(((o.was - o.now) / o.was) * 100),
    currency: "NZD",
    ribbon: null,
    categories: [o.category],
    variantId: null,
    inStock: true,
    quantityAvailable: null,
    expiresAt: null,
    status: "Live",
    isFlash: Boolean(o.flash),
    terms: null,
    businessName: o.businessName,
    businessLogoUrl: null,
    businessWebsite: null,
    businessPhone: null,
    businessAddress: null,
    businessCity: "Auckland",
    businessSuburb: o.businessSuburb,
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
  } as Deal;
}

export const DEMO_DEALS: Deal[] = [
  demo({ id: "pizza", name: "Wood-fired pizza & burrata for two", businessName: "Example Bistro", businessSuburb: "Ponsonby", image: "/megadeal/restaurants/restaurant-hero-bright.webp", now: 49, was: 78, category: "Food & Drink" }),
  demo({ id: "massage", name: "Relaxing 60 min massage", businessName: "Example Day Spa", businessSuburb: "Takapuna", image: "/images/beauty-spa/beauty-massage.webp", now: 69, was: 120, category: "Beauty & Spa" }),
  demo({ id: "ferry", name: "Harbour cruise for two", businessName: "Example Tours", businessSuburb: "Auckland CBD", image: "/images/advertise/things-to-do/cruises-day-trips-v1.webp", now: 39, was: 68, category: "Things To Do", flash: true }),
  demo({ id: "nails", name: "Gel manicure & pedicure", businessName: "Example Nail Studio", businessSuburb: "Newmarket", image: "/images/beauty-spa/beauty-nails.webp", now: 55, was: 100, category: "Beauty & Spa" }),
  demo({ id: "detail", name: "Full interior & exterior car detail", businessName: "Example Auto Care", businessSuburb: "Mt Wellington", image: "/images/home-car-business/car-detailing-640.webp", now: 129, was: 220, category: "Home & Car" }),
  demo({ id: "kayak", name: "Guided sea kayak tour", businessName: "Example Adventures", businessSuburb: "Devonport", image: "/images/advertise/things-to-do/adventure-outdoors-v1.webp", now: 59, was: 99, category: "Things To Do" }),
  demo({ id: "facial", name: "Signature facial – 60 mins", businessName: "Example Skin Clinic", businessSuburb: "Remuera", image: "/images/beauty-spa/beauty-facial.webp", now: 79, was: 140, category: "Beauty & Spa", flash: true }),
  demo({ id: "clean", name: "Two-hour home clean", businessName: "Example Cleaners", businessSuburb: "Mt Eden", image: "/images/home-car-business/cleaning-640.webp", now: 89, was: 150, category: "Home & Car" }),
];
