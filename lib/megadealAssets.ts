import { MEGADEAL_ART } from "./megadealAssetManifest.generated";

export type MegadealArt = {
  /** Wordmark + elephant lockup for the header. */
  logo: string | null;
  /** Auckland skyline, styled as a tilted photo card. */
  aucklandCard: string | null;
  /** Mascot holding a "BIG DEALS AHEAD!" tag — the hero. */
  mascotBigDeals: string | null;
  /** Waving half-body mascot — signup / promo sections. */
  mascotWave: string | null;
  /** Full-body jumping mascot — lower sections. */
  mascotJump: string | null;
};

/**
 * Resolves the mascot / brand artwork in public/megadeal/.
 *
 * This used to check the filesystem directly with fs.existsSync() on the
 * assumption that it would only ever run at build time on Node — true for
 * app/layout.tsx's own call (a purely synchronous module, prerendered once
 * and never re-executed), but not for every caller. app/coming-soon/page.tsx
 * makes its own separate call to this function, and that page awaits a
 * live Wix Data read (getSignupStats), which makes it a dynamic/revalidating
 * route: its top-level code, including this call, genuinely re-runs inside
 * the live Cloudflare Workers runtime on every render. fs does not work
 * there, existsSync silently returned false for every asset, and the whole
 * page fell back to the vector illustrations — deterministically, on every
 * single render, which is why purging Cloudflare's cache didn't help: it
 * wasn't stale cached content, it was the correct output of code that
 * cannot run where it was running.
 *
 * MEGADEAL_ART is generated at build time instead (see
 * scripts/generate-megadeal-manifest.mjs, wired in as this project's
 * "prebuild" script) by the exact same existsSync check — but run once, on
 * Node, writing the result as a plain object literal with no filesystem
 * access in the file that ships. Reading that is safe anywhere this module
 * is evaluated, because there is no longer anything runtime-dependent left
 * to differ.
 */
export function getMegadealArt(): MegadealArt {
  return MEGADEAL_ART;
}
