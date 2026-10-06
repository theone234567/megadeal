import { readFileSync } from "fs";
import { join } from "path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * A file from public/, wherever this runs.
 *
 * In Node (`next build`, `next dev`) it's read from disk. On Cloudflare
 * Workers there is no disk (fs.readFileSync throws "not implemented"), but
 * public/ is deployed as the site's static assets, so it's read through
 * the ASSETS binding (wrangler.toml) instead: same file, no network trip,
 * and no dependency on the live site already having it.
 *
 * Exists because the share images (opengraph-image routes) read their logo
 * and fonts from disk on the assumption that they're only ever made at
 * build time. On Cloudflare, with no incremental cache configured
 * (open-next.config.ts), they're made per request, so every one of them
 * failed with a 500 and shared links went out with no image.
 */
export async function readPublicFile(path: string): Promise<Uint8Array> {
  const clean = path.replace(/^\/+/, "");
  try {
    return new Uint8Array(readFileSync(join(process.cwd(), "public", clean)));
  } catch {
    // No filesystem here: try the deployed static assets.
  }
  const { env } = await getCloudflareContext({ async: true });
  const assets = (env as { ASSETS?: { fetch(req: Request): Promise<Response> } }).ASSETS;
  if (!assets) throw new Error(`Can't read public/${clean}: no filesystem and no ASSETS binding`);
  const res = await assets.fetch(new Request(`https://assets.invalid/${clean}`));
  if (!res.ok) throw new Error(`public/${clean}: ASSETS answered ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
