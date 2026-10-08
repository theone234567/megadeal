import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { withDb } from "@/lib/db/connection";
import { applyMigrations } from "@/lib/db/migrate";
import { MIGRATION_FILES } from "@/lib/db/migrationFiles";
import { logAdminAction } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";

/**
 * Admin only: brings the database up to date with supabase/migrations
 * (lib/db/migrate.ts), the button version of scripts/migrate.ts --apply.
 * Runs only the update files bundled with the site (lib/db/migrationFiles.ts),
 * never anything sent to it; each applies whole or not at all, and one
 * already applied is never run twice.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await withDb((db) => applyMigrations(db, MIGRATION_FILES));
    if (result.applied.length) await logAdminAction({ action: "Database updated", detail: result.applied.join(", ") });
    return NextResponse.json(result);
  } catch (err) {
    // The update's own words name the file and the rule, not data.
    console.error("[admin/apply-migrations] failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "The update didn't apply. Nothing was changed." }, { status: 500 });
  }
}
