import type { Sql } from "./sql";
import { MIGRATION_MARKERS } from "./migrationMarkers";

/**
 * Brings a database up to date with supabase/migrations (scripts/migrate.ts),
 * so setting one up is one command rather than pasting files in order.
 *
 * What's been applied is recorded where the Supabase CLI records it
 * (supabase_migrations.schema_migrations), so either can be used, and a
 * database set up earlier by pasting files into the SQL editor is
 * recognised from what's in it (lib/db/migrationMarkers.ts) rather than
 * having its tables created a second time.
 *
 * Each file runs in its own transaction: it applies whole or not at all,
 * and a failure stops there with everything before it kept.
 */

export interface MigrationFile {
  /** e.g. 20261006000000_initial_schema.sql */
  file: string;
  sql: string;
}

const VERSION = /^(\d{14})_([a-z0-9_]+)\.sql$/;

export function migrationVersion(file: string): { version: string; name: string } {
  const m = VERSION.exec(file);
  if (!m) throw new Error(`${file} isn't named like 20261006000000_what_it_does.sql`);
  return { version: m[1], name: m[2] };
}

const TRACKING = `
  create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`;

export interface MigrationStatus {
  applied: string[];
  /** Already in the database (set up by hand), recorded without running. */
  recognised: string[];
  pending: MigrationFile[];
}

/** Whether `marker` holds; false if it can't even be asked (e.g. the thing it names isn't there). */
async function holds(db: Sql, marker: string): Promise<boolean> {
  try {
    await db.query("savepoint marker");
    const [row] = await db.query<{ ok: boolean }>(`select (${marker}) as ok`);
    await db.query("release savepoint marker");
    return Boolean(row?.ok);
  } catch {
    await db.query("rollback to savepoint marker").catch(() => {});
    return false;
  }
}

/** What's applied and what isn't. Changes nothing (it runs in a transaction it rolls back). */
export async function migrationStatus(db: Sql, files: MigrationFile[]): Promise<MigrationStatus> {
  await db.query("begin");
  try {
    return await statusInside(db, files);
  } finally {
    await db.query("rollback").catch(() => {});
  }
}

async function statusInside(db: Sql, files: MigrationFile[]): Promise<MigrationStatus> {
  for (const f of files) migrationVersion(f.file);
  const tracked = (await db.query<{ exists: boolean }>("select to_regclass('supabase_migrations.schema_migrations') is not null as exists"))[0]?.exists;
  const appliedVersions = tracked ? (await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations")).map((r) => r.version) : [];
  const applied = files.filter((f) => appliedVersions.includes(migrationVersion(f.file).version)).map((f) => f.file);

  // Nothing recorded: anything already in the database was set up by hand.
  const recognised: string[] = [];
  if (applied.length === 0) {
    for (const f of files) {
      const marker = MIGRATION_MARKERS.find((m) => m.file === f.file);
      if (marker && (await holds(db, marker.sql))) recognised.push(f.file);
      else break; // in order: the first one missing, and everything after it, is still to do
    }
  }
  const done = new Set([...applied, ...recognised]);
  const pending = files.filter((f) => !done.has(f.file));

  // A file older than one already applied would be applied out of order.
  const newest = [...done].sort().pop();
  const early = pending.find((f) => newest && f.file < newest);
  if (early) throw new Error(`${early.file} is older than ${newest}, which is already applied. Rename it to come after.`);
  return { applied, recognised, pending };
}

/** Applies what's pending, one transaction per file. */
export async function applyMigrations(db: Sql, files: MigrationFile[]): Promise<{ recognised: string[]; applied: string[] }> {
  const status = await migrationStatus(db, files);
  const record = async (file: string, statements: string[]) => {
    const { version, name } = migrationVersion(file);
    await db.query("insert into supabase_migrations.schema_migrations (version, statements, name) values ($1, $2, $3) on conflict (version) do nothing", [version, statements, name]);
  };
  if (status.recognised.length) {
    await db.query("begin");
    try {
      await db.query(TRACKING);
      for (const file of status.recognised) await record(file, []);
      await db.query("commit");
    } catch (err) {
      await db.query("rollback").catch(() => {});
      throw err;
    }
  }
  const applied: string[] = [];
  for (const f of status.pending) {
    await db.query("begin");
    try {
      await db.query(TRACKING);
      await db.query(f.sql);
      await record(f.file, [f.sql]);
      await db.query("commit");
      applied.push(f.file);
    } catch (err) {
      await db.query("rollback").catch(() => {});
      throw new Error(`${f.file} failed, so it and everything after it weren't applied: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { recognised: status.recognised, applied };
}
