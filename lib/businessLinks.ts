/**
 * The business advertising pages. Before 5 Oct 2026 nothing on the site
 * linked to them (only the sitemap did), and pages nothing links to rank
 * poorly. Linked from the footer on every page and, as cards with a line
 * each, from /list-your-business: the hub for business owners, with each
 * industry page as a spoke.
 */
export const ADVERTISE_PAGES = [
  {
    href: "/advertise/restaurants",
    title: "Restaurants & cafés",
    footer: "Restaurants",
    blurb: "Fill quieter tables and welcome new regulars.",
  },
  {
    href: "/advertise/beauty-spa",
    title: "Beauty & spa",
    footer: "Beauty & spa",
    blurb: "Promote quieter appointment times to local clients.",
  },
  {
    href: "/advertise/things-to-do",
    title: "Activities & experiences",
    footer: "Things to do",
    blurb: "Fill tours, sessions and classes with more locals.",
  },
  {
    href: "/advertise/home-car",
    title: "Home & car services",
    footer: "Home & car",
    blurb: "Win more local jobs, from cleaning to car care.",
  },
] as const;
