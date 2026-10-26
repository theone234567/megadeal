import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { backupBucket, backupKey } from "@/lib/backupStorage";
import { gzipJson, takeBackup } from "@/lib/db/backup";
import { withDb } from "@/lib/db/connection";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Admin only: saves a copy of the database into the private BACKUPS bucket
 * now, from Admin > System checks, so it needs neither GitHub nor a
 * terminal: the same copy the nightly job takes (app/api/cron/backup).
 * POST { what: "database" }.
 *
 * Says only where it saved and how much, never what: a copy holds
 * personal details, and nothing serves the bucket.
 */
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);
  const body = ((await readSmallJson(req, JSON_BODY_MAX)) ?? {});
  if (body?.what !== "database") return json({ error: "Bad request." }, 400);

  const bucket = await backupBucket();
  if (!bucket) return json({ error: "No backup storage connected: add the BACKUPS bucket to wrangler.toml." }, 503);
  const now = new Date();
  try {
    const backup = await withDb((db) => takeBackup(db, now));
    const bytes = await gzipJson(backup);
    const key = backupKey(now);
    await bucket.put(key, bytes, { httpMetadata: { contentType: "application/gzip" } });
    await logAdminAction({ action: "Saved a copy of the database", detail: key });
    return json({ saved: key, bytes: bytes.length });
  } catch (err) {
    console.error("[admin/save-copy] database copy failed", err);
    return json({ error: "The copy didn't complete. Please try again." }, 500);
  }
}
