import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { backupBucket, backupKey, wixCopyKey } from "@/lib/backupStorage";
import { gzipJson, takeBackup } from "@/lib/db/backup";
import { dataBackend, withDb } from "@/lib/db/connection";
import { exportWix, type WixReader } from "@/lib/db/exportWix";
import { SITE_URL } from "@/lib/siteConfig";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * Admin only: saves a copy into the private BACKUPS bucket now, from
 * Admin > Moving off Wix, so neither needs GitHub or a terminal.
 *
 *   POST { what: "database" }  the same copy the nightly job takes
 *                              (app/api/cron/backup), once the site runs
 *                              on the new database: e.g. straight after
 *                              switching it on.
 *   POST { what: "wix" }       everything in Wix, as read for the import
 *                              (lib/db/exportWix.ts), to keep before the
 *                              Wix subscription ends. Only a whole copy is
 *                              saved.
 *
 * Says only where it saved and how much, never what: a copy holds
 * personal details, and nothing serves the bucket.
 */
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);
  const body = await req.json().catch(() => ({}));
  const what = body?.what === "database" ? "database" : body?.what === "wix" ? "wix" : null;
  if (!what) return json({ error: "Bad request." }, 400);

  const bucket = await backupBucket();
  if (!bucket) return json({ error: "No backup storage connected: add the BACKUPS bucket to wrangler.toml." }, 503);
  const now = new Date();

  if (what === "database") {
    if (dataBackend() !== "postgres") return json({ error: "The data is still in Wix: save a copy of Wix instead." }, 409);
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

  let exported;
  try {
    exported = await exportWix(createWixAdminClient() as unknown as WixReader);
  } catch (err) {
    console.error("[admin/save-copy] reading Wix failed", err);
    return json({ error: "Couldn't read from Wix. Please try again." }, 502);
  }
  const failed = Object.keys(exported.failed);
  if (failed.length) {
    return json({ error: `Some of Wix couldn't be read in full (${failed.join(", ")}), so nothing was saved. Try again.` }, 502);
  }
  try {
    const bytes = await gzipJson({ format: "megadeal-wix-copy-1", takenAt: now.toISOString(), counts: exported.counts, data: exported.data });
    const key = wixCopyKey(now);
    await bucket.put(key, bytes, { httpMetadata: { contentType: "application/gzip" } });
    await logAdminAction({ action: "Saved a copy of Wix", detail: key });
    return json({ saved: key, bytes: bytes.length, counts: exported.counts });
  } catch (err) {
    console.error("[admin/save-copy] saving the Wix copy failed", err);
    return json({ error: "The copy didn't save. Please try again." }, 500);
  }
}
