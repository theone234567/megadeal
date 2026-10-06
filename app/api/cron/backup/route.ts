import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { dataBackend, withDb } from "@/lib/db/connection";
import { packBackup, takeBackup } from "@/lib/db/backup";
import { backupBucket, backupKey } from "@/lib/backupStorage";

export const dynamic = "force-dynamic";

/**
 * Nightly (.github/workflows/backup.yml): a copy of every table in
 * MegaDeal's own database, gzipped JSON, into the private BACKUPS bucket
 * (lib/db/backup.ts, lib/backupStorage.ts). Put back with
 * scripts/restore-backup.ts. Only once the data lives there
 * (DATA_BACKEND=postgres); before that it's in Wix.
 *
 * Says only how much it saved, never what.
 */
export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (dataBackend() !== "postgres") return NextResponse.json({ skipped: "The data is still in Wix." });

  const bucket = await backupBucket();
  if (!bucket) {
    console.error("[cron/backup] no BACKUPS bucket is bound");
    return NextResponse.json({ error: "No backup storage connected." }, { status: 503 });
  }
  try {
    const now = new Date();
    const backup = await withDb((db) => takeBackup(db, now));
    const bytes = await packBackup(backup);
    const key = backupKey(now);
    await bucket.put(key, bytes, { httpMetadata: { contentType: "application/gzip" } });
    const rows = Object.fromEntries(Object.entries(backup.tables).map(([t, r]) => [t, r.length]));
    return NextResponse.json({ saved: key, bytes: bytes.length, rows });
  } catch (err) {
    console.error("[cron/backup] failed", err);
    return NextResponse.json({ error: "The backup didn't complete." }, { status: 500 });
  }
}
