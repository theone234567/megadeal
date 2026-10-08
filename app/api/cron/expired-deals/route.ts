import { NextRequest, NextResponse } from "next/server";
import { createDataClient } from "@/lib/dataClient";
import { notifyDealChanged } from "@/lib/indexNowDeal";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { cronCaller } from "@/lib/cronAuth";

/**
 * Hourly (Cloudflare's Cron Trigger, lib/scheduledJobs.ts): tells Bing and the
 * other IndexNow engines about deals whose run has just ended (and
 * scheduled deals that have just started), so an
 * expired offer drops out of their results instead of lingering until
 * their next crawl. Every other change already notifies them as it
 * happens (lib/indexNowDeal.ts); running out of time is the one with no
 * event behind it.
 *
 * Only the site's own scheduler, or CRON_SECRET, can call it (lib/cronAuth.ts).
 * It only reads deals and sends public URLs to IndexNow, but there's no
 * reason to let anyone else trigger it.
 */

// Wider than the hour between runs, so a delayed or skipped run still
// catches everything. Re-sending a URL is harmless.
const LOOKBACK_MS = 3 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Before launch deal pages aren't public, so there's nothing to tell.
  if (!SITE_LAUNCHED) return NextResponse.json({ notified: 0, skipped: "not launched" });

  try {
    const adminClient = createDataClient();
    // Filtered here rather than in the query: expiresAt is compared as a
    // timestamp whatever form Wix stores it in.
    const result = await adminClient.items.query("Deals").eq("status", "Live").limit(1000).find();
    const now = Date.now();
    const ended = (result.items ?? []).filter((d: any) => {
      const end = d.expiresAt ? new Date(d.expiresAt).getTime() : NaN;
      return Number.isFinite(end) && end <= now && end > now - LOOKBACK_MS && d.productId;
    });
    // Scheduled deals (lib/dealSchedule.ts) that have just started: their
    // pages went public at the start time, with no event behind it.
    const started = (result.items ?? []).filter((d: any) => {
      const start = d.scheduledStartAt && d.firstPublishedAt ? new Date(d.firstPublishedAt).getTime() : NaN;
      return Number.isFinite(start) && start <= now && start > now - LOOKBACK_MS && d.productId;
    });
    for (const deal of [...ended, ...started]) notifyDealChanged(adminClient, deal);
    return NextResponse.json({ notified: ended.length + started.length });
  } catch (err) {
    console.error("[cron/expired-deals] failed", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
