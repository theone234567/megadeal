import { SITE_URL } from "./siteConfig";

/**
 * The site's own two brand faces (see lib/fonts.ts — Fredoka for headings,
 * Plus Jakarta Sans for body text), self-hosted here as plain TTF files
 * under public/megadeal/fonts/ so ImageResponse can load them the same way
 * it loads the logo: fetched by absolute URL rather than read from disk,
 * since this deploys to Cloudflare Workers via OpenNext, which has no real
 * filesystem for fs.readFileSync to read from.
 *
 * next/font's own Fredoka/Plus_Jakarta_Sans objects (lib/fonts.ts) can't be
 * reused here — those resolve to CSS variables/classNames for the browser
 * to load, not raw font bytes, and ImageResponse's `fonts` option needs the
 * actual TTF data. Downloaded once from Google Fonts' CDN and committed as
 * static assets rather than fetched from Google at request time, so this
 * has no runtime dependency on a third party staying up.
 */
type OgFont = { name: string; data: ArrayBuffer; weight: 600 | 700; style: "normal" };

let cachedFonts: Promise<OgFont[]> | null = null;

export function getOgFonts(): Promise<OgFont[]> {
  if (!cachedFonts) {
    cachedFonts = Promise.all([
      fetch(`${SITE_URL}/megadeal/fonts/Fredoka-Bold.ttf`).then((r) => r.arrayBuffer()),
      fetch(`${SITE_URL}/megadeal/fonts/PlusJakartaSans-SemiBold.ttf`).then((r) => r.arrayBuffer()),
    ]).then(([fredoka, jakarta]): OgFont[] => [
      { name: "Fredoka", data: fredoka, weight: 700, style: "normal" },
      { name: "Plus Jakarta Sans", data: jakarta, weight: 600, style: "normal" },
    ]);
  }
  return cachedFonts;
}
