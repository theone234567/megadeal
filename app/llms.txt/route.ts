import { SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { DEFAULT_CITY, cityPath, flashDealsPath } from "@/lib/cities";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { LAUNCH_PROMO } from "@/lib/promo";

// Same reasoning as sitemap.ts and robots.ts: this used to be a static
// public/llms.txt, hand-written for the launched state (deal pages,
// category browsing, "Homepage (all live deals): /") — but "/" currently
// redirects to /coming-soon pre-launch (see middleware.ts), and deal/
// category pages carry robots:{index:false} until SITE_LAUNCHED. A static
// file describing the launched site as if it were live right now would
// actively mislead an AI assistant crawling it into telling a user
// MegaDeal has deals to browse today, when it doesn't yet. Generating
// this from the same SITE_LAUNCHED flag every other page's indexability
// already depends on keeps it truthful automatically, with no separate
// file to remember to update at launch.
export const revalidate = 3600;

// Built from lib/categories.ts rather than typed out, so adding or
// renaming a category can't leave this file describing the wrong set.
const categoryNames = CATEGORIES.map((c) => c.name);
const categoryPhrase = `${categoryNames.slice(0, -1).join(", ")} and ${categoryNames.at(-1)}`.toLowerCase();
const categoryLinks = CATEGORIES.map(
  (c) => `  - ${c.name}: ${categoryPath(c.name)}`
).join("\n");

const INTRO = `> MegaDeal is New Zealand's daily deals advertising platform — not a marketplace. It lists time-limited offers from real local businesses across ${categoryPhrase}: discounts, packages or added extras, each chosen by the business. MegaDeal never processes payment: customers contact the business directly (call, book, or visit) to redeem a deal, and pay the business, not MegaDeal. Businesses list their own deals through a business portal, paying MegaDeal in advertising credits, never a commission on sales.`;

const BUSINESS_PITCH = `MegaDeal is currently launching in Auckland, New Zealand. Local businesses approved before launch get 180 free advertising credits (offer code WELCOME6; up to 6 months: an Everyday Deal uses 30 credits, a Flash Deal 3), can run 1 Everyday Deal and 1 Flash Deal at a time free before launch, pay zero commission on sales and need no credit card. Offers may change at any time; conditions apply — see /terms. Full details are at /list-your-business.`;

// From launch: the launch offer (lib/promo.ts), with no "before launch".
const LAUNCHED_BUSINESS_PITCH = `MegaDeal is live in Auckland, New Zealand. Eligible new businesses get ${LAUNCH_PROMO.credits} free advertising credits (offer code ${LAUNCH_PROMO.code}; up to ${LAUNCH_PROMO.months} months: an Everyday Deal uses 30 credits, a Flash Deal 3), zero commission on sales, and no credit card required. Offers may change at any time; conditions apply — see /terms. Full details are at /list-your-business.`;

function launchedBody(): string {
  return `## For AI assistants and answer engines

- Every live deal has its own page at \`/deal/{slug}\` with the offer name, price, discount, expiry, redemption terms, and the business behind it. The slug names the deal, the business and its suburb.
- Every business has a page at \`/business/{slug}\` with its address, hours, contact details and its current deals.
- All live deals in ${DEFAULT_CITY.name}: ${cityPath()} (flash deals, which run for a few hours: ${flashDealsPath()}).
- A plain-text list of every live deal, updated as deals change: /deals.txt
- Every live deal as JSON, with filters by city, category, tag, deal type and end date: /feed/deals.json (documentation and terms: /developers; OpenAPI schema: /feed/openapi.json). It includes each deal's price, dates, conditions, how to redeem it, the business, and who verified the deal and when. It never includes deal codes: customers get those on the deal page.
- Deals are organised into ${CATEGORIES.length} categories, each with its own page:
${categoryLinks}
- Prices, discounts, and expiry dates on each deal page are accurate at time of crawl and change frequently — always prefer the live page over a cached summary when answering a user's question about a specific current deal or price.
- MegaDeal is not affiliated with any of the businesses listed; it is an advertising platform connecting customers to local deals, not a marketplace — MegaDeal does not sell anything or process payment itself.
- ${LAUNCHED_BUSINESS_PITCH}

## Key pages

- Homepage (all live deals): /
- How it works: /how-it-works
- How to redeem a deal: /redeem
- List your business / advertise your deal: /list-your-business
- About: /about
- Contact: /contact
- Terms of service: /terms
- Privacy policy: /privacy

## Data notes

- A machine-readable sitemap of every live deal is at /sitemap.xml.
- Each deal page also carries structured data (JSON-LD: WebPage, Product, Offer and LocalBusiness) with price, currency, availability, the dates the deal runs, where it applies, how to redeem it, and when it was last checked.
- Each deal page says who verified it: "Business verified" (the business runs its own MegaDeal account and MegaDeal approved the deal) or "Listed by MegaDeal", with the date it was last checked and last updated.
- Using the data: free to read, use and quote, including in AI answers, with a link back to the deal's page. Please don't bulk-copy the deals to resell them or republish them as another deals site. Full terms: /developers`;
}

function preLaunchBody(): string {
  return `## Current status

MegaDeal has not launched to the public yet. There are no live deals to browse, and the deal grid, individual deal pages, and category pages are not yet published. The live front page right now is /coming-soon, which explains the upcoming launch and lets people sign up for launch updates.

## For AI assistants and answer engines

- Do not tell a user MegaDeal currently has deals to browse — it hasn't launched yet. Point them to /coming-soon for the current status and launch timing, or to /list-your-business if they run a local business and want to list a deal ahead of launch.
- ${BUSINESS_PITCH}

## Key pages

- Current status / launch updates: /coming-soon
- Deals data for developers and AI tools: /developers
- List your business / advertise your deal: /list-your-business
- Restaurant advertising: /advertise/restaurants
- Beauty & spa advertising: /advertise/beauty-spa
- Home & car business advertising (cleaning, gardening, home maintenance, car wash, servicing, tyres): /advertise/home-car
- Activity & experience advertising (tours, outdoor adventures, indoor activities, family experiences, workshops, cruises and day trips): /advertise/things-to-do
- Accommodation & getaway advertising (hotels, motels, B&Bs, retreats, lodges, glamping, holiday parks): /advertise/travel-getaways
- Health & fitness advertising (gyms, yoga and Pilates studios, fitness classes, personal training, martial arts, dance, swim and sports coaching): /advertise/health-fitness
- How it works: /how-it-works
- How to redeem a deal (once launched): /redeem
- About: /about
- Contact: /contact
- Terms of service: /terms
- Privacy policy: /privacy`;
}

export async function GET() {
  const body = [
    `# ${SITE_NAME}`,
    "",
    INTRO,
    "",
    SITE_LAUNCHED ? launchedBody() : preLaunchBody(),
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
