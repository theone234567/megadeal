import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { withDb } from "@/lib/db/connection";
import { packBackup, takeBackup } from "@/lib/db/backup";
import { backupBucket, backupKey } from "@/lib/backupStorage";
import { sendTransactionalEmail } from "@/lib/sendEmail";

export const dynamic = "force-dynamic";

/**
 * Nightly (Cloudflare's Cron Trigger, lib/scheduledJobs.ts): a copy of every table in
 * MegaDeal's own database, gzipped JSON, into the private BACKUPS bucket
 * (lib/db/backup.ts, lib/backupStorage.ts). Put back with
 * scripts/restore-backup.ts, or from Admin > System checks.
 *
 * Says only how much it saved, never what.
 */
/**
 * Tells the owner a night's copy didn't complete: a scheduled run's
 * failure otherwise shows only in Cloudflare's logs. (If the site is down
 * altogether, that's for the uptime monitor.)
 */
async function alertOwner(why: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const ok = await sendTransactionalEmail({
    to,
    subject: "MegaDeal: last night's database backup didn't complete",
    html: `<div style="font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;font-size:15px;color:#211033;">
      <p>Last night's copy of MegaDeal's database didn't complete: ${why}</p>
      <p>The site itself may be fine. In Admin &gt; System checks, check "Nightly backup", and press "Save a copy of the database" to take one now. Cloudflare's logs for the megadeal Worker say more.</p>
    </div>`,
  }).catch(() => false);
  if (!ok) console.error("[cron/backup] couldn't email the owner about it");
}

export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const bucket = await backupBucket();
  if (!bucket) {
    console.error("[cron/backup] no BACKUPS bucket is bound");
    await alertOwner("the site has no backup storage connected (the BACKUPS bucket in wrangler.toml).");
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
    await alertOwner("the database or the backup storage didn't answer.");
    return NextResponse.json({ error: "The backup didn't complete." }, { status: 500 });
  }
}
