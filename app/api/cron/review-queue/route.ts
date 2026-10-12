import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { withDb } from "@/lib/db/connection";
import { alertReviewQueue } from "@/lib/reviewQueueAlert";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Hourly (lib/scheduledJobs.ts): emails the owner when a business or a
 * deal has newly come up for a decision (lib/reviewQueueAlert.ts). Says
 * only what it did, never who.
 */
export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const result = await withDb((db) => alertReviewQueue(db, SITE_URL));
    return NextResponse.json({ result }, { status: result === "failed" ? 502 : 200 });
  } catch (err) {
    console.error("[cron/review-queue] failed", err);
    return NextResponse.json({ error: "Couldn't check what's waiting." }, { status: 500 });
  }
}
