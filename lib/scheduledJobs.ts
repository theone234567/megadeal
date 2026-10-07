/**
 * The site's scheduled jobs, run by Cloudflare itself (Cron Triggers in
 * wrangler.toml, handled in worker.mjs). They used to be GitHub jobs
 * calling the site from outside, which Cloudflare's bot protection
 * challenges (and GitHub turns schedules off in a public repository after
 * 60 days without a commit).
 *
 * Each job is one of the site's own /api/cron routes, called inside the
 * Worker with CRON_SECRET, so it never meets the bot protection. Until
 * CRON_SECRET is set in Cloudflare they do nothing.
 *
 * No imports: worker.mjs is bundled by wrangler, outside Next.
 */

/** Cron expression (UTC, as in wrangler.toml) → the routes it runs, in order. */
export const SCHEDULED_JOBS: Record<string, string[]> = {
  // Nightly copy of the database, about 2:30am in Auckland (app/api/cron/backup).
  "23 14 * * *": ["/api/cron/backup"],
  // Hourly: tell search engines about deals that just ended
  // (app/api/cron/expired-deals), and check the database answers
  // (app/api/cron/watch).
  "17 * * * *": ["/api/cron/expired-deals", "/api/cron/watch"],
};

type FetchSite = (req: Request) => Promise<Response>;

/**
 * Runs every route for `cron`, each whatever the others did. Throws when
 * any didn't succeed, so Cloudflare records the run as failed (the routes
 * that matter email the owner themselves).
 */
export async function runScheduledJob(cron: string, env: { CRON_SECRET?: string }, fetchSite: FetchSite, origin = "https://megadeal.co.nz"): Promise<string> {
  const paths = SCHEDULED_JOBS[cron];
  if (!paths) throw new Error(`No job for the schedule "${cron}": add it to lib/scheduledJobs.ts.`);
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return `${paths.join(", ")}: CRON_SECRET isn't set, nothing to do`;
  const results: string[] = [];
  const failed: string[] = [];
  for (const path of paths) {
    try {
      const res = await fetchSite(new Request(`${origin}${path}`, { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
      results.push(`${path}: ${res.status}`);
      if (!res.ok) failed.push(`${path} answered ${res.status}`);
    } catch (err) {
      failed.push(`${path} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failed.length) throw new Error(failed.join("; "));
  return results.join(", ");
}
