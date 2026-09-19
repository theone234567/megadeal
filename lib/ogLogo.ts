import { readFileSync } from "fs";
import { join } from "path";

/**
 * The real MegaDeal logo (elephant + wordmark), pre-rendered to PNG
 * (public/megadeal/megadeal-logo-og.png) so every generated share image can
 * embed the actual brand mark instead of a hand-drawn approximation of it.
 *
 * PNG rather than the site's own WebP: ImageResponse's renderer (Satori)
 * has inconsistent WebP support across versions, while PNG is universally
 * safe.
 *
 * Read from disk at build time, not fetched by URL. opengraph-image routes
 * with no dynamic params are prerendered once during `next build` — a real
 * Node process with a real filesystem, unlike this project's Cloudflare
 * Workers *runtime* (which is what ruled out `fs` for anything that runs
 * per-request). A same-origin fetch here would in fact be a build-time
 * chicken-and-egg bug: the asset this fetch wants doesn't exist on
 * production yet, because deploying it is the whole point of this build.
 */
let cachedDataUri: string | null = null;

export function getLogoDataUri(): string {
  if (cachedDataUri) return cachedDataUri;
  const buf = readFileSync(join(process.cwd(), "public/megadeal/megadeal-logo-og.png"));
  cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUri;
}
