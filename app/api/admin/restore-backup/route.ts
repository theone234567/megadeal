import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { BACKUP_KEY, backupBucket, listBackups } from "@/lib/backupStorage";
import { restoreBackup, unpackBackup } from "@/lib/db/backup";
import { dataBackend, withDb } from "@/lib/db/connection";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Admin only: puts a nightly copy (app/api/cron/backup) back into the
 * database, from Admin > Moving off Wix, so recovering from a lost
 * database needs no terminal (docs/WIX-MIGRATION.md, "Backups").
 *
 *   GET                                    the copies in the bucket, newest first
 *   POST { key, mode: "rehearse" }         loads it, checks it, undoes it
 *   POST { key, mode: "restore" }          the same, kept
 *
 * Only into a database that has the tables and no data (lib/db/backup.ts
 * refuses anything else), so it can never overwrite or mix with what's
 * there: it's for a new, empty database after a disaster. Says only how
 * many of each it put back.
 */
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  const bucket = await backupBucket();
  if (!bucket) return json({ error: "No backup storage connected." }, 503);
  try {
    const backups = (await listBackups(bucket)).slice(0, 14).map((o) => ({ key: o.key, uploaded: o.uploaded, size: o.size }));
    return json({ backups });
  } catch (err) {
    console.error("[admin/restore-backup] listing failed", err);
    return json({ error: "Couldn't look in the backup bucket just now." }, 502);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "restore" ? "restore" : body?.mode === "rehearse" ? "rehearse" : null;
  const key = typeof body?.key === "string" && BACKUP_KEY.test(body.key) ? body.key : null;
  if (!mode || !key) return json({ error: "Bad request." }, 400);
  if (dataBackend() !== "postgres") return json({ error: "The site still reads Wix: a backup is restored into the new database once it's switched on." }, 409);

  const bucket = await backupBucket();
  if (!bucket) return json({ error: "No backup storage connected." }, 503);
  const object = await bucket.get(key).catch(() => null);
  if (!object) return json({ error: "That backup isn't in the bucket." }, 404);

  let backup;
  try {
    backup = await unpackBackup(new Uint8Array(await object.arrayBuffer()));
  } catch (err) {
    console.error("[admin/restore-backup] unreadable backup", err);
    return json({ error: "That backup couldn't be read." }, 422);
  }
  try {
    const { counts, loginsToRelink } = await withDb((db) => restoreBackup(db, backup, { commit: mode === "restore" }));
    if (mode === "restore") await logAdminAction({ action: "Restored the database from a backup", detail: key });
    return json({ mode, restored: mode === "restore", takenAt: backup.takenAt, counts, loginsToRelink });
  } catch (err) {
    // restoreBackup's own refusals are plain sentences ("merchants already
    // has data…"); anything else is the database's, which can name hosts.
    const message = err instanceof Error ? err.message : "";
    const plain = /already has data|isn't a MegaDeal backup|has tables this database doesn't|has columns this database doesn't/.test(message);
    if (!plain) console.error("[admin/restore-backup] restore failed", err);
    return json({ error: plain ? `Nothing was restored: ${message}` : "The restore stopped and nothing was kept. Please try again." }, plain ? 409 : 500);
  }
}
