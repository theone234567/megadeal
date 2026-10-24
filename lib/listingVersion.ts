/**
 * What the public listings were built from, as one short string that
 * changes the moment a deal is published, paused, cancelled, edited or
 * ends early, or a business changes (SEO pack T214): the newest
 * content_updated_at of any submitted deal (a trigger moves it on every
 * status, content or date change, never on a view or click) and the newest
 * change to a business.
 *
 * The cached listing (lib/fetchDealServer.ts) and the edge copies of the
 * listing pages (lib/assetCache.ts) are kept against it, so a paused deal
 * is gone from the next request instead of after a minute or five.
 *
 * Plain imports only: worker.mjs, bundled outside Next, uses it too.
 */
export const LISTING_VERSION_SQL = `select
  coalesce((select max(content_updated_at) from public.deals where status <> 'Draft'), 'epoch'::timestamptz)::text
  || '|' || coalesce((select max(updated_at) from public.merchants), 'epoch'::timestamptz)::text as v`;

type Query = { query<R>(text: string, params?: unknown[]): Promise<R[]> };

export async function readListingVersion(db: Query): Promise<string> {
  const [row] = await db.query<{ v: string }>(LISTING_VERSION_SQL);
  return row.v;
}

/** The version as a cache-key part: short, and safe in a URL. */
export function listingVersionKey(version: string): string {
  let h = 0;
  for (let i = 0; i < version.length; i++) h = (Math.imul(h, 31) + version.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * For the Worker's page cache (worker.mjs): the version straight from the
 * database through Hyperdrive, or null if it can't be read in time (the
 * page copies then fall back to being kept for their usual minute).
 */
export async function readListingVersionFromHyperdrive(connectionString: string | undefined): Promise<string | null> {
  if (!connectionString) return null;
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString, connectionTimeoutMillis: 3_000, query_timeout: 3_000 });
    await client.connect();
    try {
      return listingVersionKey(await readListingVersion({ query: async (t: string) => (await client.query(t)).rows }));
    } finally {
      client.end().catch(() => {});
    }
  } catch (err) {
    console.error("[listingVersion] couldn't read the listing version", err instanceof Error ? err.message : err);
    return null;
  }
}
