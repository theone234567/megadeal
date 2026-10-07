import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { migrationStatus, type MigrationFile } from "./migrate";
import { setupSql } from "./setupSql";

/** The paste-in setup script (scripts/setup-sql.ts) on a new database, as Supabase's SQL editor runs it. */

const dir = join(process.cwd(), "supabase/migrations");
const files: MigrationFile[] = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));

const sqlFor = (db: PGlite): Sql => ({
  query: async (text, params) => (params ? (await db.query(text, params as any[])).rows : ((await db.exec(text)).at(-1)?.rows ?? [])) as any[],
});

describe("setup script", () => {
  it("sets up a new database whole, and migrate.ts then finds nothing to do", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    await pg.exec(setupSql(files));
    const db = sqlFor(pg);
    const status = await migrationStatus(db, files);
    expect(status.pending).toEqual([]);
    expect(status.applied).toEqual(files.map((f) => f.file));
    const [{ n }] = await db.query<{ n: string }>("select count(*) as n from public.categories");
    expect(Number(n)).toBe(6);
    // Every table has row-level security on.
    const open = await db.query<{ relname: string }>("select relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
    expect(open).toEqual([]);
    await pg.close();
  }, 60_000);

  it("changes nothing when run a second time", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    const script = setupSql(files);
    await pg.exec(script);
    await expect(pg.exec(script)).rejects.toThrow(/already has MegaDeal's tables/);
    await pg.exec("rollback").catch(() => {});
    const [{ n }] = (await pg.query<{ n: string }>("select count(*) as n from public.categories")).rows;
    expect(Number(n)).toBe(6);
    await pg.close();
  }, 60_000);
});
