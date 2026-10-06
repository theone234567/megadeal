import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import type { Sql } from "./sql";
import { BACKUP_TABLES, packBackup, restoreBackup, takeBackup, tablesNotBackedUp, unpackBackup } from "./backup";

/** A backup taken from one database and put back into a new, empty one comes back the same. */

const sqlFor = (db: PGlite): Sql => ({ query: async (text, params) => (await db.query(text, params as any[])).rows as any[] });

let source: PGlite;
let src: Sql;

/** Everything a table holds, comparable across databases. */
const dump = async (db: Sql, table: string) =>
  (await db.query(`select to_jsonb(t) as r from public.${table} t order by 1`)).map((x) => JSON.stringify(x.r)).sort();

beforeAll(async () => {
  source = (await createTestDb()).db;
  src = sqlFor(source);
  const [m] = await src.query<{ id: string }>(
    `insert into public.merchants (email, business_name, suburb, status, credits_balance, category_slug)
     values ('owner@harbourbistro.co.nz', 'Harbour Bistro', 'Ōtāhuhu', 'Approved', 7, 'food-drink') returning id`
  );
  // Renamed once: an old address to keep, and a "last changed" time to keep.
  await src.query("update public.merchants set business_name = 'Harbour Bistro & Bar' where id = $1", [m.id]);
  await src.query(
    `insert into public.deals (merchant_id, name, description, category_slug, price_now, price_was, status, first_published_at, expires_at)
     values ($1, 'Two-course dinner', 'Mains and dessert', 'food-drink', 49, 80, 'Live', now(), now() + interval '7 days')`,
    [m.id]
  );
  await src.query("insert into public.merchant_activity (merchant_id, type, amount, description) values ($1, 'credit', 12, 'Welcome credits'), ($1, 'deal', -4, 'Deal submitted')", [m.id]);
  await src.query("insert into public.email_signups (email, audience, verified) values ('fan@example.nz', 'customer', true)");
  await src.query("insert into public.contact_messages (name, email, message) values ('Sam', 'sam@example.nz', 'Hello there')");
}, 60_000);

afterAll(async () => {
  await source?.close();
});

describe("backups", () => {
  it("cover every table there is", async () => {
    expect(await tablesNotBackedUp(src)).toEqual([]);
  });

  it("come back exactly as they were, addresses and dates included", async () => {
    const backup = await unpackBackup(await packBackup(await takeBackup(src)));
    expect(backup.tables.merchants).toHaveLength(1);
    expect(backup.tables.slug_redirects).toHaveLength(1); // the old address from the rename

    const target = (await createTestDb()).db;
    const dst = sqlFor(target);
    const { counts } = await restoreBackup(dst, backup, { commit: true });
    expect(counts.merchants).toBe(1);
    expect(counts.merchant_activity).toBe(2);
    for (const table of BACKUP_TABLES) {
      expect(await dump(dst, table), table).toEqual(await dump(src, table));
    }

    // New rows carry on after the restored ones.
    const [m] = await dst.query<{ id: string }>("select id from public.merchants");
    await dst.query("insert into public.merchant_activity (merchant_id, type, description) values ($1, 'deal', 'After restore')", [m.id]);
    const ids = (await dst.query<{ id: number }>("select id from public.merchant_activity order by id")).map((r) => Number(r.id));
    expect(new Set(ids).size).toBe(3);

    // The database's own rules work again afterwards.
    await dst.query("update public.merchants set business_name = 'Harbour Bistro Ponsonby' where id = $1", [m.id]);
    const [after] = await dst.query<{ slug: string }>("select slug from public.merchants where id = $1", [m.id]);
    expect(after.slug).toBe("harbour-bistro-ponsonby-otahuhu");
    await target.close();
  });

  it("a rehearsal changes nothing, and nothing goes into a database that has data", async () => {
    const backup = await takeBackup(src);
    const target = (await createTestDb()).db;
    const dst = sqlFor(target);
    await restoreBackup(dst, backup);
    expect(await dump(dst, "merchants")).toEqual([]);

    await restoreBackup(dst, backup, { commit: true });
    await expect(restoreBackup(dst, backup, { commit: true })).rejects.toThrow(/already has data/);
    await expect(restoreBackup(dst, { format: "something-else" } as any)).rejects.toThrow(/isn't a MegaDeal backup/);
    await target.close();
  });
});
