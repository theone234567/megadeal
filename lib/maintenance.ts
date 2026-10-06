/**
 * Pausing changes for the switch-over (docs/WIX-MIGRATION.md, stage 2):
 * between the final Wix export and the switch, anything a business saves
 * would land in Wix after its data was copied, and be lost. With
 * MAINTENANCE_MODE=writes (a [vars] line in wrangler.toml), requests that
 * change something are turned away with a plain message, and everything
 * else keeps working: every page, signing in, admin, the scheduled jobs.
 *
 * Read by middleware.ts for /api requests only. No edge-only or
 * server-only imports, so it's tested directly.
 */

export const MAINTENANCE_MESSAGE =
  "MegaDeal is moving to its new home, so saving changes is paused for about an hour. Nothing you've saved is affected. Please try again soon.";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Still allowed while paused: they change nothing a business entered, or must always work. */
const ALWAYS_OPEN = [
  "/api/admin/", // the switch-over itself is done from admin
  "/api/cron/",
  "/api/health",
  "/api/csp-report",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/me",
  "/api/auth/email-hook",
  "/api/deals/track", // view counts on public pages
  "/api/places/", // address suggestions: a lookup, not a save
  "/api/email-signup/unsubscribe", // honoured at once, always
];

export function maintenanceOn(value: string | undefined = process.env.MAINTENANCE_MODE): boolean {
  return value === "writes";
}

/** True when this request should be turned away while changes are paused. */
export function blockedForMaintenance(method: string, path: string, value?: string): boolean {
  if (!maintenanceOn(value)) return false;
  if (SAFE_METHODS.has(method.toUpperCase())) return false;
  if (!path.startsWith("/api/")) return false;
  return !ALWAYS_OPEN.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)));
}
