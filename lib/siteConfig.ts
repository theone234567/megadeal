/**
 * Central site metadata used across generateMetadata calls, sitemap.ts,
 * robots.ts, and JSON-LD. NEXT_PUBLIC_SITE_URL is set in the Cloudflare
 * Worker's runtime variables (megadeal.co.nz) — everything here reads
 * from it rather than hardcoding a deployment URL.
 */
// The fallback is the real production domain, NOT a preview deployment
// URL. Every canonical tag, the sitemap, robots.txt's Host line and all
// JSON-LD are built from this: if NEXT_PUBLIC_SITE_URL is ever missing or
// misconfigured on a deploy, a preview-URL fallback would silently tell
// Google the live site is a duplicate of a stale deployment. Falling back
// to the canonical domain makes that failure mode harmless.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://megadeal.co.nz";

export const SITE_NAME = "MegaDeal";

/** The @id of the site-wide Organization in app/layout.tsx's JSON-LD, so a
 *  page can point at MegaDeal rather than describe a second one. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * THE LAUNCH SWITCH. Change to `true` to launch MegaDeal.
 *
 * While false, the customer side of the site — the homepage deal grid,
 * /auckland (and its category and flash-deal pages), /deal/* and /business/* — is visible only to
 * someone signed into /admin (see middleware.ts); everyone else is sent
 * to /coming-soon, so real businesses' test deals can be created and
 * checked end to end without the public seeing them. Business sign-up,
 * the merchant portal and admin stay reachable regardless.
 *
 * Lives in code so launching is a one-line change and a deploy: the way
 * to launch. The SITE_LAUNCHED variable in the Cloudflare Worker's
 * settings launches it too (either one being true counts), but only if
 * it's added as type **Secret**: every deploy replaces the plain-text
 * variables with wrangler.toml's (which has no keep_vars), so a
 * plain-text SITE_LAUNCHED would vanish at the next deploy and quietly
 * send the site back to "coming soon".
 *
 * Before flipping it: cancel test deals and the test business in /admin.
 */
const LAUNCHED = false;

export const SITE_LAUNCHED = LAUNCHED || process.env.SITE_LAUNCHED === "true";

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
  "New Zealand's daily deals site — restaurants, spas, activities and getaways at up to 50% off from real local Kiwi businesses.";

/**
 * The registered legal entity behind MegaDeal, referenced in /terms and
 * /privacy so those documents name an identifiable, contactable party
 * rather than just the trading name — a contract needs an identifiable
 * party to be enforceable, and the Privacy Act 2020 requires an agency to
 * be identifiable too.
 */
export const LEGAL_ENTITY_NAME = "Babo Investments Limited";
export const LEGAL_ENTITY_NZBN = "9429035341451";

/**
 * Which coming-soon design /coming-soon shows: "v2" (the Coming Soon pack
 * of 3 Oct 2026) only when the value is exactly "v2"; anything else,
 * including unset, keeps the existing page. Fails closed.
 *
 * Read at BUILD time: /coming-soon is prerendered. The live choice is
 * COMING_SOON_LIVE below, in code, because the site is built by
 * Cloudflare's own Workers Builds on each push, which never sees the
 * GitHub workflow's env. To roll back, set it to "legacy" and push (or,
 * without a commit, set COMING_SOON_DESIGN=legacy under the Worker's
 * Settings -> Build -> Variables and retry the build). A signed-in admin
 * can preview V2 at any time at /coming-soon?design=v2 (middleware.ts).
 */
export function comingSoonDesign(value: string | undefined): "v2" | "legacy" {
  return value === "v2" ? "v2" : "legacy";
}
const COMING_SOON_LIVE = "v2";
export const COMING_SOON_DESIGN = comingSoonDesign(process.env.COMING_SOON_DESIGN ?? COMING_SOON_LIVE);

/**
 * Which /list-your-business design visitors get: "legacy" (the current
 * page) or "v2" (the redesign with the two-step signup, from the
 * Business Page pack). Only an exact "v2" turns it on; anything else is
 * legacy. Same arrangement as COMING_SOON_DESIGN: the value is set in
 * code (LIST_BUSINESS_LIVE) because the site is built by Cloudflare,
 * which never saw the GitHub workflow's variables; LIST_BUSINESS_DESIGN
 * in the build environment overrides it. Admins can preview v2 at
 * /list-your-business?design=v2 whatever this says. The signup backend
 * is the same for both, so switching never affects accounts or credits.
 */
export function listBusinessDesign(value: string | undefined): "v2" | "legacy" {
  return value === "v2" ? "v2" : "legacy";
}
const LIST_BUSINESS_LIVE = "v2";
export const LIST_BUSINESS_DESIGN = listBusinessDesign(process.env.LIST_BUSINESS_DESIGN ?? LIST_BUSINESS_LIVE);
