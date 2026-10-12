import "server-only";
import { withDb } from "./db/connection";
import { createPgAdminClient, type PgAdminClient } from "./db/wixShim";

/**
 * The server's client for MegaDeal's records (businesses, deals, activity,
 * sign-ups, messages, settings) in MegaDeal's own database, through the
 * calls the routes were written against (lib/db/wixShim.ts).
 */
export function createDataClient(): PgAdminClient {
  return createPgAdminClient(withDb);
}
