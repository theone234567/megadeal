/**
 * While the site is pre-launch, middleware redirects "/" to /coming-soon,
 * so /coming-soon is the page people actually land on and share. Next
 * only attaches a generated social card to the route segment that owns
 * the opengraph-image file, so without this one, every share of the
 * pre-launch homepage rendered as a bare text card with no image —
 * despite twitter:card asking for summary_large_image.
 *
 * Re-exported from the root card rather than duplicated, so the two can
 * never drift apart.
 */
export { default, size, contentType } from "../opengraph-image";

export const alt = "MegaDeal — big local deals are on the way in Auckland";
