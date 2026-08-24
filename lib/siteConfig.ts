/**
 * Central site metadata used across generateMetadata calls, sitemap.ts,
 * robots.ts, and JSON-LD. Set NEXT_PUBLIC_SITE_URL in Vercel once a custom
 * domain is attached (e.g. https://megadeal.co.nz) — everything here reads
 * from it rather than hardcoding the current *.vercel.app deployment URL.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://megadeal23456.vercel.app";

export const SITE_NAME = "MegaDeal";

export const SITE_DESCRIPTION =
  "New Zealand's daily deals site — restaurants, spas, activities and getaways at up to 70% off from real local Kiwi businesses.";
