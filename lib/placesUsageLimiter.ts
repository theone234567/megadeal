import { withDb } from "@/lib/db/connection";

const DAILY_LIMIT = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Site-wide daily circuit breaker for the Google Places proxy routes.
 * Server-only — never import this from a "use client" component. The check
 * and the count are one step in the database (use_api_allowance), so two
 * lookups at once can't both take the last one. Fails closed: any error is
 * treated as "over quota" so a real backend issue never accidentally opens
 * the tap.
 */
export async function tryConsumePlacesQuota(): Promise<boolean> {
  try {
    const [row] = await withDb((db) =>
      db.query<{ ok: boolean }>("select public.use_api_allowance('google-places', $1, $2::date) as ok", [DAILY_LIMIT, todayKey()])
    );
    return Boolean(row?.ok);
  } catch (err) {
    console.error("[placesUsageLimiter] quota check failed, failing closed", err);
    return false;
  }
}
