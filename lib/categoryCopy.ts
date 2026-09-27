/**
 * Search-facing words for each category page: the <title>, meta
 * description, the line under the heading and a short section below the
 * deals. Without these a category page was a bare heading ("Food &
 * Drink") over a grid — nothing for Google to rank for searches like
 * "restaurant deals Auckland".
 *
 * Keyed by category slug (see lib/categories.ts). Everything here must
 * stay true to how MegaDeal works: free for customers, no vouchers, the
 * customer contacts and pays the business directly.
 */

/** Where MegaDeal is launching. Change here when it expands. */
export const SEO_REGION = "Auckland";

export interface CategoryCopy {
  /** Goes in "<heading> deals in Auckland". */
  heading: string;
  /** Meta description, under ~155 characters. */
  description: string;
  /** One or two sentences under the H1. */
  intro: string;
  /** Short section below the deals. */
  more: { heading: string; paragraphs: string[] };
}

const HOW_IT_WORKS =
  "MegaDeal is free for customers. There's no voucher to buy: tap “Get deal code”, contact the business to book or visit, quote your code and pay them directly at the deal price. Check each deal's conditions, because the business sets its own days, times and limits.";

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  "food-drink": {
    heading: "Food & drink",
    description: `Restaurant, café and bar deals in ${SEO_REGION} — set menus, lunch specials and meals for two from local eateries. Free to use, no vouchers.`,
    intro: `Restaurant, café and bar deals from local ${SEO_REGION} eateries — set menus, lunch combos, brunch specials and dinners for two.`,
    more: {
      heading: `Eating out for less in ${SEO_REGION}`,
      paragraphs: [
        `These offers come straight from ${SEO_REGION} restaurants, cafés, bakeries, takeaways and bars, often for their quieter lunch, early-evening or midweek sittings. It's a good way to try somewhere new without paying full price.`,
        HOW_IT_WORKS,
      ],
    },
  },
  "beauty-spa": {
    heading: "Beauty & spa",
    description: `Beauty and spa deals in ${SEO_REGION} — nails, hair, massage, facials, lashes and day spas from local salons. Free to use, no vouchers.`,
    intro: `Salon and spa deals across ${SEO_REGION} — nails, hair, massage, facials, lashes, brows and day-spa packages.`,
    more: {
      heading: `Treat yourself for less in ${SEO_REGION}`,
      paragraphs: [
        `Local nail bars, hair salons, massage studios and day spas list offers here to fill appointment times, so you'll often find first-visit specials and weekday packages.`,
        HOW_IT_WORKS,
      ],
    },
  },
  "things-to-do": {
    heading: "Things to do",
    description: `Things to do in ${SEO_REGION} for less — activities, experiences, classes and family days out from local operators. Free to use, no vouchers.`,
    intro: `Activities and experiences around ${SEO_REGION} — days out, classes, games and adventures at a lower price.`,
    more: {
      heading: `Days out in ${SEO_REGION} for less`,
      paragraphs: [
        `Looking for something to do this weekend? Local operators post deals on activities, experiences, classes and family outings here, so it's worth checking before you book.`,
        HOW_IT_WORKS,
      ],
    },
  },
  "travel-getaways": {
    heading: "Travel & getaways",
    description: `Getaway and accommodation deals from New Zealand hosts — weekend escapes, stays and short breaks. Free to use, no vouchers.`,
    intro: `Weekend escapes and short breaks from New Zealand accommodation providers and tour operators.`,
    more: {
      heading: "Getaways for less",
      paragraphs: [
        `Hosts and operators list offers here for their quieter nights and seasons, from a night away close to ${SEO_REGION} to a longer break further afield.`,
        HOW_IT_WORKS,
      ],
    },
  },
  "health-fitness": {
    heading: "Health & fitness",
    description: `Health and fitness deals in ${SEO_REGION} — gyms, classes, personal training and wellness from local providers. Free to use, no vouchers.`,
    intro: `Gym, class and wellness deals from ${SEO_REGION} providers — try a new studio or trainer for less.`,
    more: {
      heading: `Get active in ${SEO_REGION} for less`,
      paragraphs: [
        `Gyms, studios, personal trainers and wellness providers use MegaDeal to introduce themselves with intro passes, class packs and first sessions.`,
        HOW_IT_WORKS,
      ],
    },
  },
  "home-car": {
    heading: "Home & car",
    description: `Home and car service deals in ${SEO_REGION} — cleaning, gardening, servicing, detailing and repairs from local businesses. Free to use, no vouchers.`,
    intro: `Deals on home and car services around ${SEO_REGION} — cleaning, gardening, servicing, detailing, tyres and repairs.`,
    more: {
      heading: `Home and car services in ${SEO_REGION} for less`,
      paragraphs: [
        `Local cleaners, gardeners, mechanics and detailers post offers here to fill their calendars, so it's a good place to look before you book a job.`,
        HOW_IT_WORKS,
      ],
    },
  },
};
