import { LOGO_STYLE } from "./brand";
import { readPublicFile } from "./publicFile";

/**
 * The MegaDeal logo the headers show (LOGO_STYLE, lib/brand.ts), pre-rendered
 * to PNG so every generated share image embeds the actual brand mark:
 * the minimal logo (public/megadeal/megadeal-logo-og-minimal.png, rendered
 * from public/brand/minimal/megadeal-logo-minimal-purple.svg) or the classic
 * one (public/megadeal/megadeal-logo-og.png).
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
const OG_LOGO =
  LOGO_STYLE === "minimal"
    ? { file: "megadeal/megadeal-logo-og-minimal.png", width: 1233, height: 260 }
    : { file: "megadeal/megadeal-logo-og.png", width: 2172, height: 724 };

/** Height for the logo drawn `width` wide, in its own proportions (never stretched). */
export function ogLogoHeight(width: number): number {
  return Math.round((width * OG_LOGO.height) / OG_LOGO.width);
}

let cachedDataUri: string | null = null;

export async function getLogoDataUri(): Promise<string> {
  if (cachedDataUri) return cachedDataUri;
  const buf = Buffer.from(await readPublicFile(OG_LOGO.file));
  cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUri;
}
