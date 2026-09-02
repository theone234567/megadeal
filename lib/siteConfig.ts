/**
 * Central site metadata used across generateMetadata calls, sitemap.ts,
 * robots.ts, and JSON-LD. NEXT_PUBLIC_SITE_URL is set in the Cloudflare
 * Worker's runtime variables (megadeal.co.nz) — everything here reads
 * from it rather than hardcoding a deployment URL.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://megadeal23456.vercel.app";

export const SITE_NAME = "MegaDeal";

export const SITE_DESCRIPTION =
  "New Zealand's daily deals site — restaurants, spas, activities and getaways at up to 70% off from real local Kiwi businesses.";

/**
 * The registered legal entity behind MegaDeal, referenced in /terms and
 * /privacy so those documents name an identifiable, contactable party
 * rather than just the trading name — a contract needs an identifiable
 * party to be enforceable, and the Privacy Act 2020 requires an agency to
 * be identifiable too.
 */
export const LEGAL_ENTITY_NAME = "Babo Investments Limited";
export const LEGAL_ENTITY_NZBN = "9429035341451";
