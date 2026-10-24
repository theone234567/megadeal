import { describe, expect, it } from "vitest";
import { purgeStaleUnconfirmed, staleUnconfirmedAccounts, unconfirmedAccountId } from "./unconfirmedSignups";

function fakeDb(rows: { id: string }[]) {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    db: { query: async (sql: string, params: unknown[] = []) => (calls.push({ sql, params }), rows) } as any,
  };
}

describe("unconfirmed sign-ups (T241)", () => {
  it("finds only an unconfirmed account for the address", async () => {
    const { db, calls } = fakeDb([{ id: "u1" }]);
    expect(await unconfirmedAccountId(db, "Owner@Example.invalid")).toBe("u1");
    expect(calls[0].sql).toMatch(/email_confirmed_at is null/);
    expect(calls[0].params).toEqual(["Owner@Example.invalid"]);
    expect(await unconfirmedAccountId(fakeDb([]).db, "x@example.invalid")).toBeNull();
  });

  it("picks stale ones that nothing on the site uses", async () => {
    const { db, calls } = fakeDb([]);
    await staleUnconfirmedAccounts(db);
    const sql = calls[0].sql;
    expect(sql).toMatch(/email_confirmed_at is null/);
    expect(sql).toMatch(/last_sign_in_at is null/);
    expect(sql).toMatch(/not exists \(select 1 from public\.merchants/);
    expect(calls[0].params).toEqual([24]);
  });

  it("deletes each and counts, never names", async () => {
    const { db } = fakeDb([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const deleted: string[] = [];
    const result = await purgeStaleUnconfirmed(db, async (id) => (deleted.push(id), { ok: id !== "b" }));
    expect(deleted).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ deleted: 2, failed: 1 });
  });
});
