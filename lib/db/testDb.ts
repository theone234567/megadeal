import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Tests only: a real, in-process Postgres (PGlite) with every Supabase
 * migration applied. Supabase's own pieces (the auth schema, its roles and
 * their default grants) are stubbed the way Supabase sets them up, so the
 * migrations' revokes and policies meet the same starting point they will
 * in production.
 */

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- Supabase's defaults: everything granted, row-level security decides.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type Who = { role: "anon" | "authenticated" | "service_role"; uid?: string };

export const PUBLIC: Who = { role: "anon" };
export const SERVER: Who = { role: "service_role" };

/** `migrations: false` gives Supabase's own pieces only, as a new project has. */
export async function createTestDb(opts: { migrations?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(process.cwd(), "supabase/migrations");
  for (const file of opts.migrations === false ? [] : readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }

  /** Runs one query as the given role, then switches back. */
  async function as<T = any>(who: Who, sql: string, params: unknown[] = []): Promise<T[]> {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who.uid ?? ""]);
    await db.exec(`set role ${who.role}`);
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec("reset role");
    }
  }

  /** Inserts one row as the server and returns its id. */
  async function insert(table: string, row: Record<string, unknown>): Promise<string> {
    const keys = Object.keys(row).filter((k) => row[k] !== undefined);
    const values = keys.map((k) => {
      const v = row[k];
      // jsonb columns take objects and arrays as JSON text; text[] takes arrays.
      return v !== null && typeof v === "object" && !(Array.isArray(v) && k === "amenities") ? JSON.stringify(v) : v;
    });
    const [{ id }] = await as<{ id: string }>(
      SERVER,
      `insert into public.${table} (${keys.join(", ")}) values (${keys.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
      values
    );
    return id;
  }

  return { db, as, insert };
}
