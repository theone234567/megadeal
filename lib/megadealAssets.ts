import fs from "node:fs";
import path from "node:path";

/**
 * Resolves the mascot / brand artwork in public/megadeal/.
 *
 * These are supplied artwork rather than anything generated here, so the
 * page cannot assume they exist. Every lookup returns null when the file
 * is missing and each caller falls back to the vector artwork the site
 * already ships — so the page is always complete, and drops the real
 * illustrations in automatically on the next build once they land. That is
 * the same arrangement findHeroPhoto() already uses for the Auckland
 * photo, kept deliberately consistent.
 *
 * Shipping <Image> tags pointing at files that aren't there would put six
 * broken-image glyphs on the live signup page, which is worse than the
 * illustration it replaces.
 *
 * The lookups run at build time on Node (this page is statically
 * prerendered), never in the Workers runtime, where fs does not exist.
 */

const DIR = path.join(process.cwd(), "public", "megadeal");

function resolve(basename: string): string | null {
  // png first: that's what the artwork was delivered as. The others let a
  // smaller export be swapped in later without touching code.
  for (const ext of ["png", "webp", "avif"]) {
    try {
      if (fs.existsSync(path.join(DIR, `${basename}.${ext}`))) {
        return `/megadeal/${basename}.${ext}`;
      }
    } catch {
      // public/megadeal may not exist yet — fall through to the fallback.
    }
  }
  return null;
}

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
 * Reads once per build. Call from a server component only.
 */
export function getMegadealArt(): MegadealArt {
  return {
    logo: resolve("megadeal-logo"),
    aucklandCard: resolve("hero-auckland-card"),
    mascotBigDeals: resolve("mascot-big-deals"),
    mascotWave: resolve("mascot-wave"),
    mascotJump: resolve("mascot-jump"),
  };
}
