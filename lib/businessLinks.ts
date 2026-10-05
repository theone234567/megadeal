/**
 * The business advertising pages, one per customer category (names as in
 * lib/categories.ts). Before 5 Oct 2026 nothing on the site linked to them
 * (only the sitemap did), and pages nothing links to rank poorly. Linked
 * from the footer on every page and, as cards, from /list-your-business:
 * the hub for business owners, with each industry page as a spoke.
 */
export const ADVERTISE_PAGES = [
  {
    slug: "food-drink",
    href: "/advertise/restaurants",
    name: "Food & Drink",
    blurb: "Restaurants, cafés and bars: fill quieter tables and welcome new regulars.",
  },
  {
    slug: "beauty-spa",
    href: "/advertise/beauty-spa",
    name: "Beauty & Spa",
    blurb: "Salons, spas and clinics: promote your quieter appointment times.",
  },
  {
    slug: "things-to-do",
    href: "/advertise/things-to-do",
    name: "Things To Do",
    blurb: "Tours, activities and classes: fill more sessions with locals.",
  },
  {
    slug: "home-car",
    href: "/advertise/home-car",
    name: "Home & Car",
    blurb: "Cleaning, garden and car services: win more local jobs.",
  },
] as const;
