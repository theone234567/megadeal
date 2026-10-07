import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { dataBackend, withDb } from "@/lib/db/connection";
import { DATABASE_WATCH_KEY } from "@/lib/kvMarkers";
import { getRateLimitKv } from "@/lib/rateLimit";
import { sendTransactionalEmail } from "@/lib/sendEmail";

export const dynamic = "force-dynamic";

/**
 * Hourly (Cloudflare's Cron Trigger, lib/scheduledJobs.ts): once the site
 * runs on its own database, checks it answers, and emails the owner when
 * it stops and again when it's back, once each, so an outage isn't first
 * heard of from a business. Runs inside the Worker, so Cloudflare's bot
 * protection (which challenges outside monitors) doesn't get in the way.
 * If the whole site is down this can't run: that's for an uptime monitor.
 *
 * Says only "up" or "down", never why: an error can name hosts and users.
 */

type State = { state: "up" | "down"; since: string };

async function answers(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ok = await Promise.race([
      withDb((db) => db.query("select 1")).then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
    ]).catch(() => false);
    if (ok) return true;
    // One blip isn't an outage: try again shortly.
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
}

async function tellOwner(subject: string, text: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const ok = await sendTransactionalEmail({
    to,
    subject,
    html: `<div style="font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;font-size:15px;color:#211033;"><p>${text}</p></div>`,
  }).catch(() => false);
  if (!ok) console.error("[cron/watch] couldn't email the owner");
}

export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (dataBackend() !== "postgres") return NextResponse.json({ skipped: "The data is still in Wix." });

  const kv = await getRateLimitKv();
  const before = await kv
    ?.get(DATABASE_WATCH_KEY)
    .then((v) => (v ? (JSON.parse(v) as State) : null))
    .catch(() => null);
  const now = new Date().toISOString();
  const up = await answers();

  if (!up) {
    console.error("[cron/watch] the database didn't answer");
    if (before?.state !== "down") {
      await kv?.put(DATABASE_WATCH_KEY, JSON.stringify({ state: "down", since: now } satisfies State)).catch(() => {});
      await tellOwner(
        "MegaDeal: the database isn't answering",
        "MegaDeal's database didn't answer just now, so pages that show deals and businesses may be failing. Check Supabase (is the project paused or down?) and Admin &gt; Moving off Wix. You'll get another email when it's back."
      );
    }
    return NextResponse.json({ database: "down" }, { status: 503 });
  }

  if (before?.state === "down") {
    const minutes = Math.max(1, Math.round((Date.parse(now) - Date.parse(before.since)) / 60_000));
    await tellOwner("MegaDeal: the database is answering again", `MegaDeal's database is answering again, after about ${minutes} minutes.`);
  }
  if (before?.state !== "up") await kv?.put(DATABASE_WATCH_KEY, JSON.stringify({ state: "up", since: now } satisfies State)).catch(() => {});
  return NextResponse.json({ database: "up" });
}
