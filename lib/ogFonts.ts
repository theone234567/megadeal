import { readPublicFile } from "./publicFile";

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
 * Read with readPublicFile (lib/publicFile.ts): from disk during the
 * build, from the deployed static assets on Cloudflare, where these images
 * are made per request.
 */
type OgFont = { name: string; data: ArrayBuffer; weight: 600 | 700; style: "normal" };

let cachedFonts: OgFont[] | null = null;

const bytes = async (path: string) => {
  const b = await readPublicFile(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

export async function getOgFonts(): Promise<OgFont[]> {
  if (!cachedFonts) {
    cachedFonts = [
      {
        name: "Fredoka",
        data: await bytes("megadeal/fonts/Fredoka-Bold.ttf"),
        weight: 700,
        style: "normal",
      },
      {
        name: "Plus Jakarta Sans",
        data: await bytes("megadeal/fonts/PlusJakartaSans-SemiBold.ttf"),
        weight: 600,
        style: "normal",
      },
    ];
  }
  return cachedFonts;
}
