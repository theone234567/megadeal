import { SITE_URL } from "./siteConfig";

/**
 * The real MegaDeal logo (elephant + wordmark), pre-rendered to PNG
 * (public/megadeal/megadeal-logo-og.png) so every generated share image can
 * embed the actual brand mark instead of a hand-drawn approximation of it.
 *
 * PNG rather than the site's own WebP: ImageResponse's renderer (Satori)
 * has inconsistent WebP support across versions, while PNG is universally
 * safe. Fetched by absolute URL rather than read from disk with `fs` —
 * this route runs wherever the Next build ends up deployed (this project
 * targets Cloudflare Workers via OpenNext), and `fs.readFileSync` needs a
 * real filesystem that a Worker doesn't have; `fetch` works everywhere.
 *
 * Cached per server instance (module-level, not per-request) since the
 * logo doesn't change between requests — avoids re-fetching and
 * re-encoding ~200KB on every single share-card render.
 */
let cachedDataUri: string | null = null;

export async function getLogoDataUri(): Promise<string> {
  if (cachedDataUri) return cachedDataUri;
  const res = await fetch(`${SITE_URL}/megadeal/megadeal-logo-og.png`);
  if (!res.ok) throw new Error(`Couldn't fetch OG logo: ${res.status}`);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  cachedDataUri = `data:image/png;base64,${base64}`;
  return cachedDataUri;
}
