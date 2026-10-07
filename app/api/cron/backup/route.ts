import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { dataBackend, withDb } from "@/lib/db/connection";
import { packBackup, takeBackup } from "@/lib/db/backup";
import { LAST_RUN_KEY, backupBucket, backupKey } from "@/lib/backupStorage";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { getRateLimitKv } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Nightly (Cloudflare's Cron Trigger, lib/scheduledJobs.ts): a copy of every table in
 * MegaDeal's own database, gzipped JSON, into the private BACKUPS bucket
 * (lib/db/backup.ts, lib/backupStorage.ts). Put back with
 * scripts/restore-backup.ts. Only once the data lives there
 * (DATA_BACKEND=postgres); before that it's in Wix, and the job only
 * keeps the new database from being paused for inactivity.
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
      <p>The site itself may be fine. In Admin &gt; Moving off Wix, check "Nightly backup", and press "Save a copy of the database" to take one now. Cloudflare's logs for the megadeal Worker say more.</p>
    </div>`,
  }).catch(() => false);
  if (!ok) console.error("[cron/backup] couldn't email the owner about it");
}

async function noteRun(result: "saved" | "awake" | "didn't answer" | "failed"): Promise<void> {
  const kv = await getRateLimitKv();
  await kv?.put(LAST_RUN_KEY, JSON.stringify({ at: new Date().toISOString(), result }), { expirationTtl: 60 * 60 * 24 * 30 }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (dataBackend() !== "postgres") {
    // Until the switch nothing else uses the new database, and Supabase's
    // free plan pauses a project after a week without activity: one small
    // query a night keeps it ready for switch day.
    const awake = await Promise.race([
      withDb((db) => db.query("select 1")).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10_000)),
    ]).catch(() => false);
    await noteRun(awake ? "awake" : "didn't answer");
    return NextResponse.json({ skipped: "The data is still in Wix.", database: awake ? "awake" : "didn't answer" });
  }

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
    await noteRun("saved");
    const rows = Object.fromEntries(Object.entries(backup.tables).map(([t, r]) => [t, r.length]));
    return NextResponse.json({ saved: key, bytes: bytes.length, rows });
  } catch (err) {
    console.error("[cron/backup] failed", err);
    await noteRun("failed");
    await alertOwner("the database or the backup storage didn't answer.");
    return NextResponse.json({ error: "The backup didn't complete." }, { status: 500 });
  }
}
