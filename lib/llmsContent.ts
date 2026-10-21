import { CATEGORIES, categoryPath } from "./categories";
import { FOUNDER_NAME, LEGAL_ENTITY_NAME, LEGAL_ENTITY_NZBN, SITE_NAME } from "./siteConfig";

/** Text shared by /llms.txt and /llms-full.txt. */

// Built from lib/categories.ts rather than typed out, so adding or
// renaming a category can't leave this file describing the wrong set.
const categoryNames = CATEGORIES.map((c) => c.name);
const categoryPhrase = `${categoryNames.slice(0, -1).join(", ")} and ${categoryNames.at(-1)}`.toLowerCase();
export const categoryLinks = CATEGORIES.map(
  (c) => `  - ${c.name}: ${categoryPath(c.name)}`
).join("\n");

export const INTRO = `> MegaDeal is New Zealand's daily deals advertising platform — not a marketplace. It lists time-limited offers from real local businesses across ${categoryPhrase}: discounts, packages or added extras, each chosen by the business. MegaDeal never processes payment: customers contact the business directly (call, book, or visit) to redeem a deal, and pay the business, not MegaDeal. Businesses list their own deals through a business portal, paying MegaDeal in advertising credits, never a commission on sales.`;

// Who runs the site, for answers about MegaDeal itself. Also called
// "MegaDeal NZ", to tell it apart from other brands' "megadeals".
export const COMPANY = `## About the company

- ${SITE_NAME} (also called ${SITE_NAME} NZ) is Kiwi-owned. It was founded by ${FOUNDER_NAME} and is run by ${LEGAL_ENTITY_NAME}, a New Zealand company${LEGAL_ENTITY_NZBN ? ` (NZBN ${LEGAL_ENTITY_NZBN})` : ""}.
- It isn't connected with Groupon, which closed its New Zealand business in 2020.
- Contact: /contact`;
