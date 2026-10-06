import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { applyMigrations, migrationStatus, migrationVersion, type MigrationFile } from "./migrate";

/** scripts/migrate.ts: a new database, one set up by hand, and one partly done. */

const dir = join(process.cwd(), "supabase/migrations");
const files: MigrationFile[] = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));

// Files hold several statements: run those whole, as pg does without parameters.
const sqlFor = (db: PGlite): Sql => ({
  query: async (text, params) => (params ? (await db.query(text, params as any[])).rows : ((await db.exec(text)).at(-1)?.rows ?? [])) as any[],
});

const tracked = async (db: Sql) => (await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations order by 1")).map((r) => r.version);

describe("migrate", () => {
  it("brings a new database fully up to date, and a second run does nothing", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    const db = sqlFor(pg);
    expect((await migrationStatus(db, files)).pending.map((f) => f.file)).toEqual(files.map((f) => f.file));
    const r = await applyMigrations(db, files);
    expect(r.applied).toEqual(files.map((f) => f.file));
    expect(await tracked(db)).toEqual(files.map((f) => migrationVersion(f.file).version));
    // The database's rules are really there.
    const [{ n }] = await db.query<{ n: string }>("select count(*) as n from public.categories");
    expect(Number(n)).toBe(6);
    expect((await applyMigrations(db, files)).applied).toEqual([]);
    await pg.close();
  }, 60_000);

  it("recognises a database set up by pasting files, and only adds what's missing", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    const db = sqlFor(pg);
    for (const f of files.slice(0, 4)) await pg.exec(f.sql); // the first four, by hand
    const status = await migrationStatus(db, files);
    expect(status.recognised).toEqual(files.slice(0, 4).map((f) => f.file));
    expect(status.pending.map((f) => f.file)).toEqual(files.slice(4).map((f) => f.file));
    const r = await applyMigrations(db, files);
    expect(r.recognised).toHaveLength(4);
    expect(r.applied).toEqual(files.slice(4).map((f) => f.file));
    expect(await tracked(db)).toHaveLength(files.length);
    await pg.close();
  }, 60_000);

  it("stops at a file that fails, keeping everything before it", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    const db = sqlFor(pg);
    const broken = [...files.slice(0, 2), { file: "20991231000000_broken.sql", sql: "create table public.oops (id int); select no_such_function();" }];
    await expect(applyMigrations(db, broken)).rejects.toThrow(/20991231000000_broken\.sql failed/);
    expect(await tracked(db)).toEqual(files.slice(0, 2).map((f) => migrationVersion(f.file).version));
    const [{ exists }] = await db.query<{ exists: boolean }>("select to_regclass('public.oops') is not null as exists");
    expect(exists).toBe(false); // the failed file left nothing behind
    await pg.close();
  }, 60_000);

  it("looking changes nothing, and a misnamed or out-of-order file is refused", async () => {
    const pg = (await createTestDb({ migrations: false })).db;
    const db = sqlFor(pg);
    await migrationStatus(db, files);
    const [{ exists }] = await db.query<{ exists: boolean }>("select to_regnamespace('supabase_migrations') is not null as exists");
    expect(exists).toBe(false);
    await expect(migrationStatus(db, [{ file: "initial.sql", sql: "" }])).rejects.toThrow(/isn't named like/);
    await applyMigrations(db, files.slice(0, 3));
    await expect(migrationStatus(db, [...files.slice(0, 3), { file: "20200101000000_old.sql", sql: "" }])).rejects.toThrow(/older than/);
    await pg.close();
  }, 60_000);
});
