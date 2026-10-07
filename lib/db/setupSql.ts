import { migrationVersion, type MigrationFile } from "./migrate";

/**
 * Every migration as one script to paste into Supabase's SQL editor, for
 * setting up a new, empty database without running scripts/migrate.ts
 * (scripts/setup-sql.ts writes it out). It runs as one transaction, so it
 * applies whole or not at all; it refuses a database that already has
 * MegaDeal's tables; and it records each file where migrate.ts and the
 * Supabase CLI look, so later updates apply on top of it as usual.
 */
export function setupSql(files: MigrationFile[]): string {
  const parts = [...files]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((f) => {
      const { version, name } = migrationVersion(f.file);
      return `-- ${f.file}\n${f.sql.trim()}\n\ninsert into supabase_migrations.schema_migrations (version, statements, name) values ('${version}', '{}', '${name}') on conflict (version) do nothing;\n`;
    });
  return `-- MegaDeal: sets up the tables, rules and functions in a new, empty
-- database. Paste the whole of this into Supabase > SQL Editor and press Run.
-- It applies whole or not at all, and stops without changing anything if the
-- database already has them.

begin;

do $$
begin
  if to_regclass('public.merchants') is not null then
    raise exception 'This database already has MegaDeal''s tables, so nothing was changed. Use scripts/migrate.ts for updates.';
  end if;
end $$;

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);

${parts.join("\n")}
commit;
`;
}
