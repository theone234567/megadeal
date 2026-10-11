import "server-only";
import { createHash } from "crypto";
import { withDb, type Sql } from "./db/connection";

/**
 * The database side of rate limits (lib/rateLimit.ts) and password-reset
 * links (lib/passwordResetTokens.ts): security audit of 10 Oct 2026,
 * findings 2 and 3. Kept apart so those files can load it only when
 * there's a database.
 */

/** The stored key: the limit's name and a hash of who it counts, so no
 *  address or IP is kept (rate_limits.key's own check). */
function storedKey(key: string): string {
  const colon = key.indexOf(":");
  const name = (colon > 0 ? key.slice(0, colon) : "limit").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 40) || "limit";
  return `${name}:${createHash("sha256").update(key).digest("hex")}`;
}

/**
 * The count in MegaDeal's own database: one statement adds to it and
 * reads it back, so simultaneous requests can't all slip under the limit
 * (security audit of 10 Oct 2026, finding 3). "unavailable" when there's
 * no database, or before its update adding rate_limits has been applied.
 */
export async function countInDatabase(key: string, windowSeconds: number): Promise<number | "unavailable"> {
  try {
    return await withDb(async (db) => {
      const [row] = await db.query<{ count: number }>(
        `insert into public.rate_limits (key, count, window_end)
         values ($1, 1, now() + make_interval(secs => $2))
         on conflict (key) do update set
           count = case when public.rate_limits.window_end <= now() then 1 else public.rate_limits.count + 1 end,
           window_end = case when public.rate_limits.window_end <= now()
             then now() + make_interval(secs => $2) else public.rate_limits.window_end end
         returning count`,
        [storedKey(key), windowSeconds],
      );
      // Now and then, clear windows that ended over a day ago.
      if (Math.random() < 0.01) {
        await db.query(`delete from public.rate_limits where window_end < now() - interval '1 day'`).catch(() => {});
      }
      return Number(row?.count ?? 1);
    });
  } catch (err) {
    if ((err as { code?: string })?.code !== "42P01") {
      console.error("[rateLimit] database count failed", key.split(":")[0], err);
    }
    return "unavailable";
  }
}

/**
 * The database, when there is one with password_reset_tokens (security
 * audit of 10 Oct 2026, finding 2): reading and deleting a link there is
 * one statement, so a link works once even if it's used twice at the same
 * moment. null: no database, or its update isn't applied yet, so the
 * caller uses Cloudflare KV as before.
 */
export async function inDatabase<T>(fn: (db: Sql) => Promise<T>): Promise<T | null> {
  try {
    return await withDb(fn);
  } catch (err) {
    if ((err as { code?: string })?.code !== "42P01") console.error("[securityStore] database failed", err);
    return null;
  }
}

