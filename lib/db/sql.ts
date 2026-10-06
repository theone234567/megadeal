/**
 * What the data code needs from a database, with no server-only parts, so
 * scripts (scripts/wix-import.mjs) and tests can use it too.
 */

/** The one thing the data code needs from a database: run a query. The
 *  tests pass an in-process Postgres with the same interface. */
export interface Sql {
  query<T = Record<string, any>>(text: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Runs `fn` in one transaction: everything it writes lands together, or
 * (if it throws) none of it does.
 */
export async function inTransaction<T>(db: Sql, fn: (db: Sql) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  }
}
