import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The connection to MegaDeal's own database (docs/WIX-MIGRATION.md).
 *
 * Off until DATA_BACKEND=postgres: until then every read and write goes to
 * Wix exactly as before, and nothing here is called.
 *
 * On Cloudflare the connection goes through Hyperdrive (the HYPERDRIVE
 * binding in wrangler.toml), which keeps a pool of connections to the
 * database warm near it, so each request's connect is fast. Locally,
 * DATABASE_URL in .dev.vars. Either way the server connects as a role
 * that bypasses row-level security and makes its own checks, as it does
 * with Wix today; row-level security guards everything else.
 */

/** The one thing the data code needs from a database: run a query. The
 *  tests pass an in-process Postgres with the same interface. */
export interface Sql {
  query<T = Record<string, any>>(text: string, params?: unknown[]): Promise<T[]>;
}

declare global {
  interface CloudflareEnv {
    HYPERDRIVE?: { connectionString: string };
  }
}

export type DataBackend = "wix" | "postgres";

export function dataBackend(): DataBackend {
  return process.env.DATA_BACKEND === "postgres" ? "postgres" : "wix";
}

async function connectionString(): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  } catch {
    // Not on Cloudflare (local development): fall through.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database not configured (HYPERDRIVE binding or DATABASE_URL).");
  return url;
}

/**
 * Runs `fn` with a database connection, closed afterwards. A Worker can't
 * keep a connection between requests, so each use opens its own;
 * Hyperdrive makes that cheap.
 */
export async function withDb<T>(fn: (db: Sql) => Promise<T>): Promise<T> {
  // Loaded here, not at the top, so nothing changes for a site still on Wix.
  const { Client } = await import("pg");
  const client = new Client({ connectionString: await connectionString() });
  await client.connect();
  try {
    return await fn({
      query: async <R,>(text: string, params?: unknown[]) => (await client.query(text, params as any[])).rows as R[],
    });
  } finally {
    client.end().catch(() => {});
  }
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
