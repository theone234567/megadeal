// GENERATED FILE — do not edit by hand.
// Produced by scripts/generate-megadeal-manifest.mjs from what's actually
// in public/megadeal/ and public/images/ at build time. Re-run
// `npm run build` (or `node scripts/generate-megadeal-manifest.mjs`
// directly) after adding or removing a file there; this file does not
// update itself.
import type { MegadealArt } from "./megadealAssets";

export const MEGADEAL_ART: MegadealArt = {
  "logo": "/megadeal/megadeal-logo.webp",
  "aucklandCard": "/megadeal/hero-auckland-card.webp",
  "mascotBigDeals": "/megadeal/mascot-big-deals.webp",
  "mascotWave": "/megadeal/mascot-wave.webp",
  "mascotJump": "/megadeal/mascot-jump.webp"
};

/** Real Auckland photography, if public/images/auckland-hero.* exists —
 *  wins over the supplied card art's own fallback chain. See
 *  app/coming-soon/page.tsx. */
export const HERO_PHOTO: string | null = null;
