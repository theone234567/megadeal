import "server-only";
import type { Sql } from "./db/connection";

/**
 * Sign-ups nobody confirmed with the emailed code (SEO pack T241). A
 * fresh sign-up for the address marks one (lib/supabaseAuth.ts
 * markSignedUpAgain), so whoever enters the code chooses the password;
 * after a day one is deleted
 * (app/api/cron/purge-unconfirmed), so an address someone else tried
 * doesn't sit waiting with their password.
 */

/** The unconfirmed account for an email address, or null (none, or confirmed). */
export async function unconfirmedAccountId(db: Sql, email: string): Promise<string | null> {
  const [row] = await db.query<{ id: string }>(
    `select id::text from auth.users
      where lower(email) = lower($1) and deleted_at is null and email_confirmed_at is null
      limit 1`,
    [email],
  );
  return row?.id ?? null;
}

export const STALE_AFTER_HOURS = 24;
/** At most this many a run; the rest go on the next. */
const PER_RUN = 200;

/** Unconfirmed accounts older than a day that nothing on the site uses:
 *  no business record (by owner or email) and never signed in. */
export async function staleUnconfirmedAccounts(db: Sql, hours = STALE_AFTER_HOURS): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `select u.id::text from auth.users u
      where u.deleted_at is null and u.email_confirmed_at is null and u.last_sign_in_at is null
        and u.created_at < now() - make_interval(hours => $1)
        and not exists (select 1 from public.merchants m where m.owner_id = u.id or lower(m.email) = lower(u.email))
      order by u.created_at
      limit ${PER_RUN}`,
    [hours],
  );
  return rows.map((r) => r.id);
}

/** Deletes them; counts only, never who. */
export async function purgeStaleUnconfirmed(
  db: Sql,
  deleteUser: (id: string) => Promise<{ ok: boolean }>,
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;
  for (const id of await staleUnconfirmedAccounts(db)) {
    if ((await deleteUser(id)).ok) deleted++;
    else failed++;
  }
  return { deleted, failed };
}
