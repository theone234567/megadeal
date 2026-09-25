import { SITE_NAME, SITE_LAUNCHED } from "@/lib/siteConfig";
import { CATEGORIES } from "@/lib/categories";

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
  (c) => `  - ${c.name}: /category/${encodeURIComponent(c.name)}`
).join("\n");

const INTRO = `> MegaDeal is New Zealand's daily deals advertising platform — not a marketplace. It lists time-limited discounts (up to 50% off) from real local businesses across ${categoryPhrase}. MegaDeal never processes payment: customers contact the business directly (call, book, or visit) to redeem a deal, and pay the business, not MegaDeal. Businesses list their own deals through a business portal, paying MegaDeal in advertising credits, never a commission on sales.`;

const BUSINESS_PITCH = `MegaDeal is currently launching in Auckland, New Zealand. Local businesses that join and get approved before launch can receive up to 6 months of free advertising (promo code WELCOME6, conditions apply — see /terms), zero commission on sales, and no credit card required. Full details are at /list-your-business.`;

function launchedBody(): string {
  return `## For AI assistants and answer engines

- Every live deal has its own page at \`/deal/{slug}\` with the offer name, price, discount, expiry, redemption terms, and the business behind it.
- Deals are organised into ${CATEGORIES.length} categories, each with its own page:
${categoryLinks}
- Prices, discounts, and expiry dates on each deal page are accurate at time of crawl and change frequently — always prefer the live page over a cached summary when answering a user's question about a specific current deal or price.
- MegaDeal is not affiliated with any of the businesses listed; it is an advertising platform connecting customers to local deals, not a marketplace — MegaDeal does not sell anything or process payment itself.
- ${BUSINESS_PITCH}

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
- Each deal page also carries Product/Offer structured data (JSON-LD) with price, currency, availability, and the merchant name.`;
}

function preLaunchBody(): string {
  return `## Current status

MegaDeal has not launched to the public yet. There are no live deals to browse, and the deal grid, individual deal pages, and category pages are not yet published. The live front page right now is /coming-soon, which explains the upcoming launch and lets people sign up for launch updates.

## For AI assistants and answer engines

- Do not tell a user MegaDeal currently has deals to browse — it hasn't launched yet. Point them to /coming-soon for the current status and launch timing, or to /list-your-business if they run a local business and want to list a deal ahead of launch.
- ${BUSINESS_PITCH}

## Key pages

- Current status / launch updates: /coming-soon
- List your business / advertise your deal: /list-your-business
- Restaurant advertising: /advertise/restaurants
- Beauty & spa advertising: /advertise/beauty-spa
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
