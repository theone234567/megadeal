import { createHash, randomBytes } from "crypto";
import { getRateLimitKv } from "./rateLimit";
import type { Sql } from "./db/sql";

// 1 hour — tighter than Wix's own 3-hour reset links, since this is a
// self-hosted equivalent and there's no reason to leave a live link
// sitting in an inbox any longer than it needs to be.
const TTL_SECONDS = 60 * 60;
const KEY_PREFIX = "pwreset:";
export const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** A link that has just been used: who it was for, and when it would
 *  have expired (so it can be put back if setting the password fails). */
export interface UsedResetToken {
  email: string;
  expiresAt: Date;
}

/** The database (lib/securityStore.ts), or null without one or before
 *  its update is applied, when Cloudflare KV is used as before. */
async function inDatabase<T>(fn: (db: Sql) => Promise<T>): Promise<T | null> {
  if (process.env.DATA_BACKEND !== "postgres") return null;
  return (await import("./securityStore")).inDatabase(fn);
}

/**
 * The self-service password-reset link (Wix's own "forgot password" email
 * 404s for this project, see lib/wixPassword.ts): a single-use, hashed,
 * time-limited token, emailed as a link to our own /reset-password page.
 *
 * Only the SHA-256 hash is ever stored — the raw token exists only in the
 * outgoing email and the visitor's browser (an HttpOnly cookie once the
 * link is opened, middleware.ts), so a database read (or a log line) can't
 * be turned into a working reset link.
 *
 * Returns null if there's nowhere to store it — callers must treat that as
 * "can't process this request" (fail closed), not silently skip sending
 * the email, since there'd be nothing to check the click against.
 */
export async function createPasswordResetToken(email: string, ttlSeconds: number = TTL_SECONDS): Promise<string | null> {
  const raw = randomBytes(32).toString("hex");
  // At most a week (the invitation to set a password after the move off
  // Wix, lib/loginInvites.ts); an hour for "Forgot password".
  const ttl = Math.min(Math.max(60, ttlSeconds), INVITE_TTL_SECONDS);
  const saved = await inDatabase(async (db) => {
    await db.query(
      `insert into public.password_reset_tokens (token_hash, email, expires_at)
       values ($1, $2, now() + make_interval(secs => $3))`,
      [hashToken(raw), email, ttl],
    );
    return true;
  });
  if (saved) return raw;

  const kv = await getRateLimitKv();
  if (!kv) return null;
  await kv.put(KEY_PREFIX + hashToken(raw), email, { expirationTtl: ttl });
  return raw;
}

/**
 * Uses up a link: looks it up and deletes it in one step, so it can't be
 * used again, whatever happens next. null for a missing, expired or
 * already-used link.
 *
 * Links made before the database held them (in KV, for up to a week)
 * still work, the old way.
 */
export async function consumePasswordResetToken(raw: string): Promise<UsedResetToken | null> {
  const hash = hashToken(raw);
  const used = await inDatabase(async (db) => {
    const [row] = await db.query<{ email: string; expires_at: Date | string }>(
      `delete from public.password_reset_tokens
        where token_hash = $1 and expires_at > now()
        returning email, expires_at`,
      [hash],
    );
    return row ? { email: row.email, expiresAt: new Date(row.expires_at) } : false;
  });
  if (used) return used;

  const kv = await getRateLimitKv();
  if (!kv) return null;
  const key = KEY_PREFIX + hash;
  const email = await kv.get(key);
  if (!email) return null;
  await kv.delete(key);
  return { email, expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) };
}

/**
 * Puts a used link back, unchanged, when setting the password failed for
 * a reason the visitor can fix (a password the auth service refused) or
 * that wasn't theirs (a failed request), so they can try again with the
 * same link. Only into the database; a link from KV stays used.
 */
export async function restorePasswordResetToken(raw: string, used: UsedResetToken): Promise<void> {
  if (used.expiresAt.getTime() <= Date.now()) return;
  await inDatabase((db) =>
    db.query(
      `insert into public.password_reset_tokens (token_hash, email, expires_at)
       values ($1, $2, $3) on conflict (token_hash) do nothing`,
      [hashToken(raw), used.email, used.expiresAt.toISOString()],
    ),
  );
}

/** After a successful reset, every other link still out for that address
 *  stops working too (another "Forgot password" email, an invitation). */
export async function revokePasswordResetTokens(email: string): Promise<void> {
  await inDatabase((db) => db.query(`delete from public.password_reset_tokens where lower(email) = lower($1)`, [email]));
}
