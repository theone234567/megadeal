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


/**
 * Admin sign-in protections (security audit of 10 Oct 2026: KV couldn't
 * guarantee these either). Each is one statement, so two requests at
 * once can't both get through. "unavailable" means no database (or no
 * table yet): callers fall back to KV as before.
 */

/** Seconds left on an IP's admin lockout, 0 when not locked out. */
export async function adminLockSecondsLeft(ip: string): Promise<number | "unavailable"> {
  try {
    return await withDb(async (db) => {
      const [row] = await db.query<{ left: number }>(
        `select ceil(extract(epoch from window_end - now()))::int as left
           from public.rate_limits where key = $1 and window_end > now()`,
        [storedKey(`admin-lock:${ip}`)],
      );
      return row ? Number(row.left) : 0;
    });
  } catch (err) {
    if ((err as { code?: string })?.code !== "42P01") console.error("[securityStore] admin lock read failed", err);
    return "unavailable";
  }
}

/** Counts a failed admin sign-in from an IP; at `max` within the window it
 *  locks the IP out for `lockSeconds`. Returns the count so far. */
export async function recordAdminFailure(
  ip: string,
  max: number,
  windowSeconds: number,
  lockSeconds: number,
): Promise<{ count: number; locked: boolean } | "unavailable"> {
  const count = await countInDatabase(`admin-attempts:${ip}`, windowSeconds);
  if (count === "unavailable") return "unavailable";
  if (count < max) return { count, locked: false };
  try {
    await withDb(async (db) => {
      await db.query(
        `insert into public.rate_limits (key, count, window_end) values ($1, 1, now() + make_interval(secs => $2))
         on conflict (key) do update set count = 1, window_end = excluded.window_end`,
        [storedKey(`admin-lock:${ip}`), lockSeconds],
      );
      await db.query(`delete from public.rate_limits where key = $1`, [storedKey(`admin-attempts:${ip}`)]);
    });
    return { count, locked: true };
  } catch (err) {
    console.error("[securityStore] admin lock write failed", err);
    return "unavailable";
  }
}

/** A correct sign-in clears the IP's count and any lockout. */
export async function clearAdminFailures(ip: string): Promise<boolean> {
  try {
    await withDb((db) =>
      db.query(`delete from public.rate_limits where key = any($1)`, [
        [storedKey(`admin-attempts:${ip}`), storedKey(`admin-lock:${ip}`)],
      ]),
    );
    return true;
  } catch {
    return false;
  }
}

const TOTP_LAST_STEP = "security:admin-totp-last-step";
const SESSIONS_REVOKED_BEFORE = "security:admin-sessions-revoked-before";

/** Claims an authenticator time step: true if it's newer than any used
 *  before (so this code hasn't been used), false for a replay. */
export async function claimTotpStep(step: number): Promise<boolean | "unavailable"> {
  try {
    return await withDb(async (db) => {
      const rows = await db.query(
        `insert into public.site_settings (key, value) values ($1, $2)
         on conflict (key) do update set value = excluded.value
           where public.site_settings.value is null
              or public.site_settings.value !~ '^[0-9]+$'
              or public.site_settings.value::bigint < excluded.value::bigint
         returning key`,
        [TOTP_LAST_STEP, String(step)],
      );
      return rows.length > 0;
    });
  } catch (err) {
    console.error("[securityStore] totp claim failed", err);
    return "unavailable";
  }
}

/** When admin sessions were last ended (ms), null if never. */
export async function adminSessionsRevokedBefore(): Promise<number | null | "unavailable"> {
  try {
    return await withDb(async (db) => {
      const [row] = await db.query<{ value: string | null }>(`select value from public.site_settings where key = $1`, [
        SESSIONS_REVOKED_BEFORE,
      ]);
      const n = Number(row?.value);
      return row && Number.isFinite(n) ? n : null;
    });
  } catch (err) {
    console.error("[securityStore] session revocation read failed", err);
    return "unavailable";
  }
}

/** Ends every admin session issued before now. */
export async function revokeAdminSessionsNow(): Promise<boolean> {
  try {
    await withDb((db) =>
      db.query(
        `insert into public.site_settings (key, value) values ($1, $2)
         on conflict (key) do update set value = excluded.value`,
        [SESSIONS_REVOKED_BEFORE, String(Date.now())],
      ),
    );
    return true;
  } catch (err) {
    console.error("[securityStore] session revocation write failed", err);
    return false;
  }
}

/**
 * One admin session ended by "Sign out" on its own device (security pack
 * T164): its signature, kept until the session would have expired anyway.
 * "Sign out everywhere" still uses revokeAdminSessionsNow.
 */
const SESSION_ENDED_PREFIX = "security:admin-session-ended:";

function endedKey(signature: string): string {
  return SESSION_ENDED_PREFIX + createHash("sha256").update(signature).digest("hex").slice(0, 32);
}

export async function endAdminSession(signature: string, expiresAt: number): Promise<boolean> {
  try {
    await withDb(async (db) => {
      // Sessions that have run out by now don't need remembering.
      await db.query(
        `delete from public.site_settings where key like $1 and value ~ '^[0-9]+$' and value::bigint < $2`,
        [SESSION_ENDED_PREFIX + "%", Date.now()],
      );
      await db.query(
        `insert into public.site_settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value`,
        [endedKey(signature), String(expiresAt)],
      );
    });
    return true;
  } catch (err) {
    console.error("[securityStore] session end write failed", err);
    return false;
  }
}

export async function adminSessionEnded(signature: string): Promise<boolean | "unavailable"> {
  try {
    return await withDb(async (db) => {
      const rows = await db.query(`select 1 from public.site_settings where key = $1`, [endedKey(signature)]);
      return rows.length > 0;
    });
  } catch (err) {
    console.error("[securityStore] session end read failed", err);
    return "unavailable";
  }
}
