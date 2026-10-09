/**
 * Small notes the site keeps in RATE_LIMIT_KV so Moving off Wix
 * (lib/migrationReadiness.ts) can say something works before anyone
 * relies on it. Times only, never who or what.
 */

/** When Supabase last reached app/api/auth/email-hook with a valid
 *  signature: proof Cloudflare's bot protection lets it through. */
export const EMAIL_HOOK_REACHED_KEY = "auth:email-hook:last";

/** Whether the hourly check (app/api/cron/watch) last found the database
 *  answering, and since when ({ state: "up" | "down", since }). */
export const DATABASE_WATCH_KEY = "cron:watch:database";

/** When the hourly jobs (app/api/cron/watch) last ran, and whether the
 *  database answered ({ at, database: "up" | "down" }). */
export const HOURLY_RUN_KEY = "cron:hourly:last";

/** How the AI deal check last went ({ at, ok, problem? }), so admin can
 *  say when it has stopped working (deals then wait for a person). */
export const AI_REVIEW_LAST_KEY = "ai:review:last";

/** The newest contact message an admin has had on screen (its created_at),
 *  so Needs attention can count the ones that came in since. */
export const MESSAGES_SEEN_KEY = "admin:messages:seen";
