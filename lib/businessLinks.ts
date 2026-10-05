/**
 * The business advertising pages, as their search titles describe them.
 * Linked from the footer and the business sections of /list-your-business
 * and /coming-soon: before 5 Oct 2026 nothing on the site linked to the
 * /advertise pages (only the sitemap did), and pages nothing links to rank
 * poorly.
 */
export const ADVERTISE_PAGES = [
  { href: "/advertise/restaurants", label: "Restaurant advertising", short: "Restaurants" },
  { href: "/advertise/beauty-spa", label: "Beauty & spa advertising", short: "Beauty & spa" },
  { href: "/advertise/things-to-do", label: "Activity advertising", short: "Activities & experiences" },
  { href: "/advertise/home-car", label: "Home & car advertising", short: "Home & car services" },
] as const;
