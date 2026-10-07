// The Worker's entry point (wrangler.toml `main`): the site as OpenNext
// builds it (.open-next/worker.js, made by `opennextjs-cloudflare build`),
// plus Cloudflare's Cron Triggers ([triggers] in wrangler.toml), which run
// the site's scheduled jobs (lib/scheduledJobs.ts) without GitHub.
//
// Every request is handled exactly as before: `fetch` is OpenNext's own.

import site from "./.open-next/worker.js";
import { runScheduledJob } from "./lib/scheduledJobs.ts";

// OpenNext's Durable Object classes, re-exported as its docs ask of a
// custom entry (unused unless bound in wrangler.toml).
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  fetch: site.fetch,

  async scheduled(controller, env, ctx) {
    const result = await runScheduledJob(controller.cron, env, (req) => site.fetch(req, env, ctx));
    console.log(`[scheduled] ${result}`);
  },
};
