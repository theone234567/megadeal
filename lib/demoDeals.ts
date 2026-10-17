import type { Deal } from "./types";
import type { BookingRequirement } from "./booking";

/**
 * The homepage's example deals before launch (app/PrelaunchHome.tsx): what
 * a MegaDeal listing and deal page will look like, with made-up businesses
 * and prices. Each opens its own example page (/example/[slug]), the real
 * deal page with an "Example only" banner.
 *
 * Fixed data in code, never from the database, so no business's real or
 * test deal ends up here. Each is labelled EXAMPLE on its card and page, its
 * code is "EXAMPLE", and it's left out of search, the results count, the
 * sitemap and every piece of offer data (the example pages are noindex).
 * The business names say "Example", the website and email use example.com
 * (reserved for examples, so nobody real is contacted), and there's no
 * phone number. Photos are the site's own.
 *
 * Every category has at least one, and the first six are one of each, so
 * no kind of business is left out of the first screen of examples.
 */
const HOURS = (open: string, close: string, closedMon = false) =>
  JSON.stringify({
    schedule: (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => ({
      day,
      closed: closedMon && day === "Mon",
      ranges: closedMon && day === "Mon" ? [] : [{ open, close }],
    })),
  });

interface ExampleInput {
  slug: string;
  name: string;
  businessName: string;
  businessSuburb: string;
  image: string;
  now: number;
  was: number;
  category: string;
  flash?: boolean;
  description: string;
  terms: string;
  bio: string;
  hours: string;
  booking: BookingRequirement;
}

function example(o: ExampleInput): Deal {
  return {
    id: `example-${o.slug}`,
    slug: o.slug,
    name: o.name,
    description: o.description,
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
    terms: o.terms,
    businessName: o.businessName,
    businessLogoUrl: null,
    businessWebsite: "https://www.example.com",
    businessPhone: null,
    businessAddress: null,
    businessCity: "Auckland",
    businessSuburb: o.businessSuburb,
    businessSlug: null,
    businessBio: o.bio,
    businessPhotos: [o.image],
    businessHours: o.hours,
    businessFacebookUrl: null,
    businessInstagramUrl: null,
    businessPriceRange: null,
    businessAmenities: [],
    businessBookingUrl: null,
    businessBookingEmail: "hello@example.com",
    businessLat: null,
    businessLng: null,
    businessRating: null,
    businessReviewCount: null,
    dealCode: "EXAMPLE",
    bookingRequirement: o.booking,
  } as Deal;
}

export const DEMO_DEALS: Deal[] = [
  example({
    slug: "pizza",
    name: "Wood-fired pizza & burrata for two",
    businessName: "Example Bistro",
    businessSuburb: "Ponsonby",
    image: "/megadeal/restaurants/restaurant-hero-bright.webp",
    now: 49,
    was: 78,
    category: "Food & Drink",
    description:
      "Two wood-fired pizzas of your choice and a burrata salad to share, at a neighbourhood bistro on Ponsonby Road.\n\n- Two pizzas from the main menu\n- Burrata and heirloom tomato salad\n- Table for two, dine-in",
    terms: "Booking required. Dine-in only. Not valid on public holidays. One per table.",
    bio: "An example neighbourhood bistro, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("11:30", "22:00", true),
    booking: "required",
  }),
  example({
    slug: "massage",
    name: "Relaxing 60 min massage",
    businessName: "Example Day Spa",
    businessSuburb: "Takapuna",
    image: "/images/beauty-spa/beauty-massage.webp",
    now: 69,
    was: 120,
    category: "Beauty & Spa",
    description:
      "An hour of full-body relaxation massage in a quiet treatment room, with warm towels and tea afterwards.\n\n- 60 minute relaxation massage\n- Choice of aromatherapy oil\n- Herbal tea after your treatment",
    terms: "Booking required. 24 hours' notice to change a booking. One per customer.",
    bio: "An example day spa, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("09:00", "19:00"),
    booking: "required",
  }),
  example({
    slug: "harbour-cruise",
    name: "Harbour cruise for two",
    businessName: "Example Tours",
    businessSuburb: "Auckland CBD",
    image: "/images/advertise/things-to-do/cruises-day-trips-v1.webp",
    now: 39,
    was: 68,
    category: "Things To Do",
    flash: true,
    description:
      "A 90 minute cruise around the Waitematā Harbour for two, past the Harbour Bridge and Devonport.\n\n- 90 minute harbour cruise for two\n- Live commentary on board",
    terms: "Booking required. Subject to weather. Departs from the downtown ferry terminal.",
    bio: "An example tour company, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("08:00", "18:00"),
    booking: "required",
  }),
  example({
    slug: "car-detail",
    name: "Full interior & exterior car detail",
    businessName: "Example Auto Care",
    businessSuburb: "Mt Wellington",
    image: "/images/home-car-business/car-detailing-640.webp",
    now: 129,
    was: 220,
    category: "Home & Car",
    description:
      "A full valet inside and out for a standard car.\n\n- Hand wash and wax\n- Interior vacuum and wipe-down\n- Windows inside and out",
    terms: "Booking required. Standard cars only; SUVs and vans extra.",
    bio: "An example car care business, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("08:00", "17:00"),
    booking: "required",
  }),
  example({
    slug: "getaway",
    name: "Waiheke sea-view getaway – 1 night for two",
    businessName: "Example Island Retreat",
    businessSuburb: "Waiheke Island",
    image: "/megadeal-coming-soon/travel-getaways-v1.webp",
    now: 189,
    was: 320,
    category: "Travel & Getaways",
    description:
      "A night away in a sea-view room on Waiheke, with breakfast and a lie-in.\n\n- One night for two in a sea-view room\n- Cooked breakfast for two\n- Late checkout at 11am",
    terms: "Booking required, subject to availability. Sunday to Thursday nights. Ferry not included.",
    bio: "An example island retreat, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("08:00", "20:00"),
    booking: "required",
  }),
  example({
    slug: "yoga",
    name: "10-class yoga pass",
    businessName: "Example Yoga Studio",
    businessSuburb: "Grey Lynn",
    image: "/megadeal-coming-soon/health-fitness-v1.webp",
    now: 79,
    was: 180,
    category: "Health & Fitness",
    description:
      "Ten classes at a calm, friendly studio, from gentle flow to power yoga.\n\n- 10 classes, any on the timetable\n- Mats provided\n- Valid for three months",
    terms: "New customers only. Book each class online. Valid for three months from your first class.",
    bio: "An example yoga studio, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("06:00", "20:30"),
    booking: "recommended",
  }),
  example({
    slug: "kayak",
    name: "Guided sea kayak tour",
    businessName: "Example Adventures",
    businessSuburb: "Devonport",
    image: "/images/advertise/things-to-do/adventure-outdoors-v1.webp",
    now: 59,
    was: 99,
    category: "Things To Do",
    description:
      "A guided two-hour paddle along the North Shore coast, for beginners and up.\n\n- Two-hour guided tour\n- Kayak, paddle and life jacket\n- Safety briefing before you go",
    terms: "Booking required. Ages 12 and over. Subject to weather.",
    bio: "An example adventure company, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("08:00", "17:00"),
    booking: "required",
  }),
  example({
    slug: "nails",
    name: "Gel manicure & pedicure",
    businessName: "Example Nail Studio",
    businessSuburb: "Newmarket",
    image: "/images/beauty-spa/beauty-nails.webp",
    now: 55,
    was: 100,
    category: "Beauty & Spa",
    description:
      "A gel manicure and a classic pedicure in one visit.\n\n- Gel manicure with your choice of colour\n- Classic pedicure\n- About 90 minutes in all",
    terms: "Booking recommended. Not valid with any other offer.",
    bio: "An example nail studio, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("09:30", "18:00"),
    booking: "recommended",
  }),
  example({
    slug: "home-clean",
    name: "Two-hour home clean",
    businessName: "Example Cleaners",
    businessSuburb: "Mt Eden",
    image: "/images/home-car-business/cleaning-640.webp",
    now: 89,
    was: 150,
    category: "Home & Car",
    description:
      "Two hours of cleaning by an experienced cleaner, with all products and equipment brought along.\n\n- Two hours of cleaning\n- Kitchen, bathrooms and floors\n- Products and equipment included",
    terms: "Booking required. Central Auckland suburbs only.",
    bio: "An example cleaning business, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("08:00", "18:00"),
    booking: "required",
  }),
  example({
    slug: "facial",
    name: "Signature facial – 60 mins",
    businessName: "Example Skin Clinic",
    businessSuburb: "Remuera",
    image: "/images/beauty-spa/beauty-facial.webp",
    now: 79,
    was: 140,
    category: "Beauty & Spa",
    flash: true,
    description:
      "A one-hour facial matched to your skin type, finished with a hand and arm massage.\n\n- Skin consultation\n- 60 minute signature facial\n- Hand and arm massage",
    terms: "Booking required. One per customer.",
    bio: "An example skin clinic, made up to show what a business's details look like on MegaDeal.",
    hours: HOURS("09:00", "18:00", true),
    booking: "required",
  }),
];

/** The example deal at /example/[slug], or null. */
export function exampleDeal(slug: string): Deal | null {
  return DEMO_DEALS.find((d) => d.slug === slug) ?? null;
}

export const exampleHref = (deal: Pick<Deal, "slug">) => `/example/${deal.slug}`;
