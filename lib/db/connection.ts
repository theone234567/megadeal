import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Sql } from "./sql";

export type { Sql } from "./sql";
export { inTransaction } from "./sql";

/**
 * The connection to MegaDeal's own database (Supabase Postgres).
 *
 * On Cloudflare the connection goes through Hyperdrive (the HYPERDRIVE
 * binding in wrangler.toml), which keeps a pool of connections to the
 * database warm near it, so each request's connect is fast. Running the
 * site locally (next dev or start), Cloudflare's local stand-in supplies
 * HYPERDRIVE too, pointing at wrangler.toml's localConnectionString: set
 * CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE to use another
 * database. Scripts (scripts/*.ts) use DATABASE_URL. Either way the
 * server connects as a role
 * that bypasses row-level security and makes its own checks; row-level
 * security guards everything else.
 */

declare global {
  interface CloudflareEnv {
    HYPERDRIVE?: { connectionString: string };
  }
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
  const { Client } = await import("pg");
  // Time limits, so a database that stops answering fails the page rather
  // than holding it: 10 s to connect, 20 s for any one query (they take
  // milliseconds; the longest, in an import or a restore, a few seconds).
  const client = new Client({ connectionString: await connectionString(), connectionTimeoutMillis: 10_000, query_timeout: 20_000 });
  await client.connect();
  try {
    return await fn({
      query: async <R,>(text: string, params?: unknown[]) => {
        try {
          return (await client.query(text, params as any[])).rows as R[];
        } catch (err) {
          throw withoutValues(err);
        }
      },
    });
  } finally {
    client.end().catch(() => {});
  }
}

/**
 * A database error without the parts that quote the data: Postgres adds a
 * "detail" naming the values a rule refused ("Key (lower(email))=(…)
 * already exists"), and callers log errors whole, so it would put people's
 * addresses in Cloudflare's logs. The message (which names the rule, not
 * the values), the error code and the constraint are kept.
 */
export function withoutValues(err: unknown): unknown {
  if (err && typeof err === "object") {
    for (const key of ["detail", "where", "internalQuery", "hint"]) {
      if (key in err) (err as Record<string, unknown>)[key] = undefined;
    }
  }
  return err;
}
