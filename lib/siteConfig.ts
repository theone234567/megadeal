/**
 * Central site metadata used across generateMetadata calls, sitemap.ts,
 * robots.ts, and JSON-LD. NEXT_PUBLIC_SITE_URL is set in the Cloudflare
 * Worker's runtime variables (megadeal.co.nz) — everything here reads
 * from it rather than hardcoding a deployment URL.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://megadeal23456.vercel.app";

export const SITE_NAME = "MegaDeal";

/**
 * Pre-launch gate: while false, middleware.ts redirects "/" to
 * /coming-soon so real visitors never see an empty (or demo-data-filled)
 * deal grid before there's a credible number of real live deals. Business
 * sign-up, the merchant portal, and admin all stay reachable regardless,
 * so merchant recruitment can happen in the background. Flip this by
 * setting the SITE_LAUNCHED runtime variable to "true" in the Cloudflare
 * Worker's settings (same place as ADMIN_PASSWORD) — no redeploy needed.
 */
export const SITE_LAUNCHED = process.env.SITE_LAUNCHED === "true";

/**
 * Same gate as SITE_LAUNCHED, but for MegaShop specifically: while false,
 * /megashop and every /megashop/[slug] product page stay noindex no
 * matter how many products are in the catalog. Phase 1 product pages get
 * built and previewed with real or placeholder supplier products before
 * checkout exists — indexing a "Checkout coming soon" product page as a
 * real shoppable listing would hand Google a non-transactable page that
 * looks live, which is exactly the kind of thin/misleading content that
 * hurts crawl trust for the rest of the site. Flip via the MEGASHOP_LAUNCHED
 * runtime variable once checkout actually works, same mechanism as
 * SITE_LAUNCHED.
 */
export const MEGASHOP_LAUNCHED = process.env.MEGASHOP_LAUNCHED === "true";

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
