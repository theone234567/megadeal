/**
 * Which MegaDeal logo the site shows. The ONE switch for it: every header
 * draws its logo through components/BrandLogo.tsx, which reads this.
 *
 * - "minimal": the flat elephant and "MegaDeal" wordmark from the minimalist
 *   logo pack (design/logo-minimal/), in the brand purple on light
 *   surfaces and white on purple or dark ones.
 * - "classic": the full-colour cartoon elephant lockup the site used before
 *   (public/branding/megadeal-logo.webp and public/megadeal/megadeal-logo.webp,
 *   both kept), exactly as each header showed it.
 *
 * To go back to the old logo, change "minimal" to "classic" below.
 *
 * Not covered by this switch, because they need a raster file rather than
 * an SVG: the emailed logo (lib/emailTemplate.ts), the share images
 * (lib/ogLogo.ts) and the favicon (app/icon.png). They still use the
 * classic logo.
 */
export const LOGO_STYLE: "classic" | "minimal" = "minimal";

/** The brand purple, as in tailwind.config.ts (brand-600 / hp-purple). */
export const BRAND_PURPLE = "#6520B5";
