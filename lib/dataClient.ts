import "server-only";
import { createWixAdminClient } from "./wixAdmin";
import { dataBackend, withDb } from "./db/connection";
import { createPgAdminClient } from "./db/wixShim";

/**
 * The server's client for MegaDeal's records (businesses, deals, activity,
 * sign-ups, messages, settings): Wix today, MegaDeal's own database once
 * DATA_BACKEND=postgres (lib/db/wixShim.ts, docs/WIX-MIGRATION.md).
 *
 * Same calls either way, so the routes don't change. What hasn't moved
 * yet (photo uploads, email, logins) still goes to Wix through it.
 */
export function createDataClient(): ReturnType<typeof createWixAdminClient> {
  if (dataBackend() === "postgres") {
    return createPgAdminClient(withDb, createWixAdminClient) as unknown as ReturnType<typeof createWixAdminClient>;
  }
  return createWixAdminClient();
}
