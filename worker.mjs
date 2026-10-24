// The Worker's entry point (wrangler.toml `main`): the site as OpenNext
// builds it (.open-next/worker.js, made by `opennextjs-cloudflare build`),
// plus Cloudflare's Cron Triggers ([triggers] in wrangler.toml), which run
// the site's scheduled jobs (lib/scheduledJobs.ts) without GitHub.
//
// Requests are OpenNext's to answer; share images and icons are also kept
// in Cloudflare's edge cache for a day (lib/assetCache.ts).

import site from "./.open-next/worker.js";
import { runScheduledJob } from "./lib/scheduledJobs.ts";
import { withEdgeCache, withPageEdgeCache, withPrebuiltImage } from "./lib/assetCache.ts";
import { readListingVersionFromHyperdrive } from "./lib/listingVersion.ts";

// OpenNext's Durable Object classes, re-exported as its docs ask of a
// custom entry (unused unless bound in wrangler.toml).
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  fetch(req, env, ctx) {
    const cache = globalThis.caches?.default;
    // This deploy's id (wrangler.toml version_metadata): page copies are kept per deploy.
    const version = env.CF_VERSION_METADATA?.id;
    // The pages that list deals are kept per listing version too, so a
    // paused or new deal shows at once (lib/listingVersion.ts).
    const listingVersion = () => readListingVersionFromHyperdrive(env.HYPERDRIVE?.connectionString);
    return withPrebuiltImage(req, env.ASSETS, (q) =>
      withEdgeCache(q, ctx, cache, (r) => withPageEdgeCache(r, ctx, cache, version, (p) => site.fetch(p, env, ctx), listingVersion))
    );
  },

  async scheduled(controller, env, ctx) {
    const result = await runScheduledJob(controller.cron, env, (req) => site.fetch(req, env, ctx));
    console.log(`[scheduled] ${result}`);
  },
};
