import { readFileSync } from "fs";
import { join } from "path";

/**
 * The site's own two brand faces (see lib/fonts.ts — Fredoka for headings,
 * Plus Jakarta Sans for body text), self-hosted here as plain TTF files
 * under public/megadeal/fonts/ so ImageResponse can load them.
 *
 * next/font's own Fredoka/Plus_Jakarta_Sans objects (lib/fonts.ts) can't be
 * reused here — those resolve to CSS variables/classNames for the browser
 * to load, not raw font bytes, and ImageResponse's `fonts` option needs the
 * actual TTF data. Downloaded once from Google Fonts' CDN and committed as
 * static assets rather than fetched from Google at request time, so this
 * has no runtime dependency on a third party staying up.
 *
 * Read from disk at build time — see lib/ogLogo.ts for why: these routes
 * are prerendered once during `next build`, a real Node process with a
 * real filesystem, not fetched per-request in the Cloudflare Workers
 * runtime this project actually deploys to.
 */
type OgFont = { name: string; data: Buffer; weight: 600 | 700; style: "normal" };

let cachedFonts: OgFont[] | null = null;

export function getOgFonts(): OgFont[] {
  if (!cachedFonts) {
    cachedFonts = [
      {
        name: "Fredoka",
        data: readFileSync(join(process.cwd(), "public/megadeal/fonts/Fredoka-Bold.ttf")),
        weight: 700,
        style: "normal",
      },
      {
        name: "Plus Jakarta Sans",
        data: readFileSync(join(process.cwd(), "public/megadeal/fonts/PlusJakartaSans-SemiBold.ttf")),
        weight: 600,
        style: "normal",
      },
    ];
  }
  return cachedFonts;
}
