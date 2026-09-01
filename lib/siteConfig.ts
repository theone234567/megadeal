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
