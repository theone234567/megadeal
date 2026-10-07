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

/** Cron expression (UTC, as in wrangler.toml) → the route it runs. */
export const SCHEDULED_JOBS: Record<string, string> = {
  // Nightly copy of the database, about 2:30am in Auckland (app/api/cron/backup).
  "23 14 * * *": "/api/cron/backup",
  // Tell search engines about deals that just ended (app/api/cron/expired-deals).
  "17 * * * *": "/api/cron/expired-deals",
};

type FetchSite = (req: Request) => Promise<Response>;

/**
 * Runs the job for `cron`. Throws when the route didn't succeed, so
 * Cloudflare records the run as failed; the backup route also emails the
 * owner itself.
 */
export async function runScheduledJob(cron: string, env: { CRON_SECRET?: string }, fetchSite: FetchSite, origin = "https://megadeal.co.nz"): Promise<string> {
  const path = SCHEDULED_JOBS[cron];
  if (!path) throw new Error(`No job for the schedule "${cron}": add it to lib/scheduledJobs.ts.`);
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return `${path}: CRON_SECRET isn't set, nothing to do`;
  const res = await fetchSite(new Request(`${origin}${path}`, { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return `${path}: ${res.status}`;
}
