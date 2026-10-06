import { readPublicFile } from "./publicFile";

/**
 * The real MegaDeal logo (elephant + wordmark), pre-rendered to PNG
 * (public/megadeal/megadeal-logo-og.png) so every generated share image can
 * embed the actual brand mark instead of a hand-drawn approximation of it.
 *
 * PNG rather than the site's own WebP: ImageResponse's renderer (Satori)
 * has inconsistent WebP support across versions, while PNG is universally
 * safe.
 *
 * Read with readPublicFile: from disk during `next build`, and from the
 * deployed static assets on Cloudflare, where these images are in fact
 * made per request (see lib/publicFile.ts). Never fetched from the live
 * site by URL: during a build, the file may not be deployed yet.
 */
let cachedDataUri: string | null = null;

export async function getLogoDataUri(): Promise<string> {
  if (cachedDataUri) return cachedDataUri;
  const buf = Buffer.from(await readPublicFile("megadeal/megadeal-logo-og.png"));
  cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUri;
}
