/**
 * Which MegaDeal logo the site shows. The ONE switch for it: every header
 * draws its logo through components/BrandLogo.tsx, which reads this.
 *
 * - "minimal": the flat elephant and "MegaDeal" wordmark from the minimalist
 *   logo pack (design/logo-minimal/), in white, on brand-purple headers.
 * - "classic": the full-colour cartoon elephant lockup the site used before
 *   (public/branding/megadeal-logo.webp and public/megadeal/megadeal-logo.webp,
 *   both kept), on the white headers, exactly as each header showed it.
 *
 * To go back to the old logo and white headers, change "minimal" to
 * "classic" below.
 *
 * The share images (lib/ogLogo.ts) and the emailed logo (lib/emailTemplate.ts)
 * follow it too, from PNGs rendered from the minimal SVG.
 *
 * The browser-tab and home-screen icons (app/favicon.ico, app/icon.png,
 * app/apple-icon.png) are files Next serves as they are, so they don't
 * follow this switch: they show the minimal elephant (from
 * public/brand/minimal/megadeal-favicon-minimal.svg). The classic ones are
 * kept in design/logo-classic/; copy them back over app/ to restore them.
 */
export const LOGO_STYLE: "classic" | "minimal" = "minimal";

/** The brand purple, as in tailwind.config.ts (brand-600 / hp-purple). */
export const BRAND_PURPLE = "#6520B5";

/**
 * The site's headers are brand purple with the white logo while the
 * minimal logo is on, and white (as before) with the classic one. Tied to
 * LOGO_STYLE, so the one switch above restores both together.
 */
export const PURPLE_HEADER = LOGO_STYLE === "minimal";
