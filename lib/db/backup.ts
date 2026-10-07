import type { Sql } from "./sql";

/**
 * Nightly copies of MegaDeal's own data (app/api/cron/backup), and putting
 * one back (scripts/restore-backup.ts). Supabase's free plan keeps no
 * backups, and even on Pro a copy outside Supabase means one company's
 * mistake can't lose the data.
 *
 * Every table in the public schema, as JSON: the businesses, deals,
 * activity, mailing list, messages, settings and old addresses. Logins
 * (Supabase's auth schema) aren't included: they're Supabase's to keep,
 * and a business can always set a new password from an emailed link.
 *
 * A copy holds personal details (emails, phone numbers): it lives only in
 * a private R2 bucket and anywhere it's downloaded to for a restore.
 */

/** In the order a restore loads them: each after what it refers to. */
export const BACKUP_TABLES = [
  "categories",
  "merchants",
  "deals",
  "merchant_activity",
  "slug_redirects",
  "email_signups",
  "contact_messages",
  "api_usage_counters",
  "site_settings",
] as const;

export interface Backup {
  format: "megadeal-backup-1";
  takenAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

/** The columns a row is saved with: all but those the database works
 *  out for itself (generated columns). */
async function storedColumns(db: Sql, table: string): Promise<string[]> {
  const rows = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1 and is_generated <> 'ALWAYS'
      order by ordinal_position`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

/** Every public table that isn't in BACKUP_TABLES (its test fails then). */
export async function tablesNotBackedUp(db: Sql): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1`
  );
  return rows.map((r) => r.name).filter((t) => !(BACKUP_TABLES as readonly string[]).includes(t));
}

/** A copy of every table, as it is now (read in one snapshot). */
export async function takeBackup(db: Sql, now = new Date()): Promise<Backup> {
  const tables: Backup["tables"] = {};
  await db.query("begin isolation level repeatable read read only");
  try {
    for (const table of BACKUP_TABLES) {
      const cols = await storedColumns(db, table);
      const [row] = await db.query<{ rows: Record<string, unknown>[] | null }>(
        `select json_agg(r) as rows from (select ${cols.map(ident).join(", ")} from public.${ident(table)} order by 1) r`
      );
      tables[table] = row?.rows ?? [];
    }
  } finally {
    await db.query("commit").catch(() => {});
  }
  return { format: "megadeal-backup-1", takenAt: now.toISOString(), tables };
}

export interface RestoreResult {
  counts: Record<string, number>;
}

/**
 * Loads a copy into a database that has the tables (supabase/migrations
 * applied) but no data yet, in one transaction: all of it, or none.
 *
 * Rows go back exactly as saved: the database's own triggers (new page
 * addresses, "last changed" times) are paused while they load, so nothing
 * is renamed or re-dated. `commit: false` loads it all, checks it and then
 * undoes it (a rehearsal).
 */
export async function restoreBackup(db: Sql, backup: Backup, opts: { commit?: boolean } = {}): Promise<RestoreResult> {
  if (backup?.format !== "megadeal-backup-1" || typeof backup.tables !== "object") throw new Error("That isn't a MegaDeal backup.");
  const unknown = Object.keys(backup.tables).filter((t) => !(BACKUP_TABLES as readonly string[]).includes(t));
  if (unknown.length) throw new Error(`The backup has tables this database doesn't: ${unknown.join(", ")}.`);

  const counts: Record<string, number> = {};
  await db.query("begin");
  try {
    for (const table of BACKUP_TABLES) {
      // Categories come with the tables; everything else must be empty,
      // so a restore can never mix two sets of data.
      if (table === "categories") continue;
      const [{ n }] = await db.query<{ n: string }>(`select count(*) as n from public.${ident(table)}`);
      if (Number(n) > 0) throw new Error(`${table} already has data. Restore into a new, empty database.`);
    }
    for (const table of BACKUP_TABLES) await db.query(`alter table public.${ident(table)} disable trigger user`);

    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table] ?? [];
      counts[table] = rows.length;
      if (!rows.length) continue;
      const cols = await storedColumns(db, table);
      const missing = Object.keys(rows[0]).filter((c) => !cols.includes(c));
      if (missing.length) throw new Error(`${table} in the backup has columns this database doesn't: ${missing.join(", ")}.`);
      const list = cols.map(ident).join(", ");
      const identity = (
        await db.query<{ column_name: string }>(
          `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 and is_identity = 'YES'`,
          [table]
        )
      ).map((r) => r.column_name);
      await db.query(
        `insert into public.${ident(table)} (${list}) ${identity.length ? "overriding system value" : ""}
         select ${list} from json_populate_recordset(null::public.${ident(table)}, $1::json)
         ${table === "categories" ? "on conflict do nothing" : ""}`,
        [JSON.stringify(rows)]
      );
      // New rows carry on numbering after the restored ones.
      for (const col of identity) {
        await db.query(
          `select setval(pg_get_serial_sequence($1, $2), greatest(coalesce((select max(${ident(col)}) from public.${ident(table)}), 0), 1))`,
          [`public.${table}`, col]
        );
      }
    }

    for (const table of BACKUP_TABLES) await db.query(`alter table public.${ident(table)} enable trigger user`);
    await db.query(opts.commit ? "commit" : "rollback");
    return { counts };
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  }
}

/** Anything as gzipped JSON, the way copies are stored. */
export async function gzipJson(value: unknown): Promise<Uint8Array> {
  const stream = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A copy as gzipped JSON, the way it's stored. */
export const packBackup = (backup: Backup): Promise<Uint8Array> => gzipJson(backup);

export async function unpackBackup(bytes: Uint8Array): Promise<Backup> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
