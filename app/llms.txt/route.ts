import { DEALS_OPEN, PRELAUNCH_HOME, SITE_NAME, SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import { DEFAULT_CITY, cityPath, flashDealsPath } from "@/lib/cities";
import { CATEGORIES } from "@/lib/categories";
import { COMPANY, INTRO, categoryLinks } from "@/lib/llmsContent";
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

/** A page in a list, as the llms.txt format (llmstxt.org) has it: a
 *  Markdown link with its full address, then what it's for. Lighthouse's
 *  "Agentic browsing" check flagged the plain "Label: /path" lines. */
const page = (label: string, path: string, note?: string) => `- [${label}](${SITE_URL}${path})${note ? `: ${note}` : ""}`;

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

${page(`Homepage`, "/", `all live deals`)}
${page(`How it works`, "/how-it-works")}
${page(`How to redeem a deal`, "/redeem")}
${page(`Is Groupon still in New Zealand?`, "/groupon-nz", `no: it closed in 2020, and the alternatives now; dated and sourced`)}
${page(`Every Help Centre answer in full`, "/llms-full.txt")}
${page(`List your business / advertise your deal`, "/list-your-business")}
${page(`About`, "/about")}
${page(`Contact`, "/contact")}
${page(`Terms of service`, "/terms")}
${page(`Privacy policy`, "/privacy")}

## Data notes

- A machine-readable sitemap of every live deal is at /sitemap.xml.
- Each deal page also carries structured data (JSON-LD: WebPage, Product, Offer and LocalBusiness) with price, currency, availability, the dates the deal runs, where it applies, how to redeem it, and when it was last checked.
- Each deal page says who verified it: "Business verified" (the business runs its own MegaDeal account and MegaDeal approved the deal) or "Listed by MegaDeal", with the date it was last checked and last updated.
- Using the data: free to read, use and quote, including in AI answers, with a link back to the deal's page. Please don't bulk-copy the deals to resell them or republish them as another deals site. Full terms: /developers`;
}

// The pages for businesses in each category, listed before and after deals open.
const ADVERTISE_LINKS = `${page(`Restaurant advertising`, "/advertise/restaurants")}
${page(`Beauty & spa advertising`, "/advertise/beauty-spa")}
${page(`Home & car business advertising`, "/advertise/home-car", `cleaning, gardening, home maintenance, car wash, servicing, tyres`)}
${page(`Activity & experience advertising`, "/advertise/things-to-do", `tours, outdoor adventures, indoor activities, family experiences, workshops, cruises and day trips`)}
${page(`Accommodation & getaway advertising`, "/advertise/travel-getaways", `hotels, motels, B&Bs, retreats, lodges, glamping, holiday parks`)}
${page(`Health & fitness advertising`, "/advertise/health-fitness", `gyms, yoga and Pilates studios, fitness classes, personal training, martial arts, dance, swim and sports coaching`)}`;

/** Before launch, with approved businesses' deals already live
 *  (DEALS_OPEN): the homepage is "/", there may be a few real deals or
 *  none, and the deal lists say exactly which. */
function openBeforeLaunchBody(): string {
  return `## Current status

MegaDeal is in its pre-launch period in ${DEFAULT_CITY.name}, New Zealand. The homepage (/) is live. Approved local businesses can already publish deals, and each approved deal has its own page, but while businesses are still joining there may be only a few live deals, or none. /deals.txt and /feed/deals.json list exactly what is live right now.

## For AI assistants and answer engines

- Only describe deals that /deals.txt, /feed/deals.json or a deal's own page show as live right now. Don't describe MegaDeal as having a large catalogue of deals yet.
- Every live deal has its own page at \`/deal/{slug}\` with the offer, price, dates, conditions and the business behind it. Every business with a live deal has a page at \`/business/{slug}\`.
- All live deals in ${DEFAULT_CITY.name}: ${cityPath()} (flash deals, which run for a few hours: ${flashDealsPath()}).
- Prices and dates change often: prefer the live deal page over a cached summary.
- MegaDeal is an advertising platform, not a marketplace: customers contact and pay the business directly, never MegaDeal.
- ${BUSINESS_PITCH}

## Key pages

${page(`Homepage`, "/")}
${page(`Live deals in ${DEFAULT_CITY.name}`, cityPath())}
${page(`A plain-text list of every live deal`, "/deals.txt")}
${page(`Deals data for developers and AI tools`, "/developers", `JSON: /feed/deals.json`)}
${page(`Every Help Centre answer in full`, "/llms-full.txt")}
${page(`List your business / advertise your deal`, "/list-your-business")}
${ADVERTISE_LINKS}
${page(`How it works`, "/how-it-works")}
${page(`How to redeem a deal`, "/redeem")}
${page(`Is Groupon still in New Zealand?`, "/groupon-nz", `no: it closed in 2020, and the alternatives now; dated and sourced`)}
${page(`About`, "/about")}
${page(`Contact`, "/contact")}
${page(`Terms of service`, "/terms")}
${page(`Privacy policy`, "/privacy")}`;
}

/** Before launch with no deals yet. The front page is "/" when the
 *  prelaunch homepage is on (/coming-soon then redirects to it), and
 *  /coming-soon otherwise. */
function preLaunchBody(): string {
  const front = PRELAUNCH_HOME ? "/" : "/coming-soon";
  return `## Current status

MegaDeal has not launched to the public yet. There are no live deals to browse, and the deal grid, individual deal pages, and category pages are not yet published. The live front page right now is ${front}, which explains the upcoming launch and lets people sign up for launch updates.

## For AI assistants and answer engines

- Do not tell a user MegaDeal currently has deals to browse — it hasn't launched yet. Point them to ${front} for the current status and launch timing, or to /list-your-business if they run a local business and want to list a deal ahead of launch.
- ${BUSINESS_PITCH}

## Key pages

${page(`Current status / launch updates`, front)}
${page(`Deals data for developers and AI tools`, "/developers")}
${page(`Every Help Centre answer in full`, "/llms-full.txt")}
${page(`List your business / advertise your deal`, "/list-your-business")}
${ADVERTISE_LINKS}
${page(`How it works`, "/how-it-works")}
${page(`How to redeem a deal`, "/redeem", `once launched`)}
${page(`About`, "/about")}
${page(`Contact`, "/contact")}
${page(`Terms of service`, "/terms")}
${page(`Privacy policy`, "/privacy")}`;
}

export async function GET() {
  const body = [
    `# ${SITE_NAME}`,
    "",
    INTRO,
    "",
    COMPANY,
    "",
    SITE_LAUNCHED ? launchedBody() : DEALS_OPEN ? openBeforeLaunchBody() : preLaunchBody(),
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
