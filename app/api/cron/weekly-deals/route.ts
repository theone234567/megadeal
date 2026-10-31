import { NextRequest, NextResponse } from "next/server";
import { cronCaller } from "@/lib/cronAuth";
import { logAdminAction } from "@/lib/adminAudit";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { sendAnnouncementBatch } from "@/lib/announcementSend";
import { SITE_LAUNCHED, SITE_URL } from "@/lib/siteConfig";
import { WEEKLY_SUBJECT, weeklyCampaign, weeklyDealsBody } from "@/lib/weeklyDeals";

export const dynamic = "force-dynamic";

// A batch an hour: a few hundred subscribers are all sent it within the
// evening, well inside Resend's per-second limit.
const BATCH = 40;

/**
 * Hourly (lib/scheduledJobs.ts): the weekly new-deals email to customers
 * who signed up for deal alerts (lib/weeklyDeals.ts). Does nothing before
 * launch, outside Thursday 5 pm to Sunday 5 pm (NZ time), or in a week
 * with no new Everyday deals.
 */
export async function POST(req: NextRequest) {
  const caller = cronCaller(req);
  if (caller === "unset") return NextResponse.json({ error: "Not configured." }, { status: 503 });
  if (caller === "refused") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!SITE_LAUNCHED) return NextResponse.json({ skipped: "not launched" });
  const campaign = weeklyCampaign();
  if (!campaign) return NextResponse.json({ skipped: "not sending time" });
  try {
    const body = weeklyDealsBody(await fetchAllLiveDealsServer(), SITE_URL);
    if (!body) return NextResponse.json({ skipped: "no new deals this week" });
    const r = await sendAnnouncementBatch({ audience: "customers", campaign, subject: WEEKLY_SUBJECT, body, batch: BATCH });
    if (r === "no-store") return NextResponse.json({ error: "Can't keep track of who's been sent it." }, { status: 503 });
    if (r.sent || r.failed || r.quotaReached) {
      await logAdminAction({
        action: `Sent the weekly deals email (${campaign})`,
        detail: `${r.sent} sent${r.failed ? `, ${r.failed} failed` : ""}, ${r.remaining} to go${r.quotaReached ? " (stopped for today: Resend's daily limit, or the room kept for sign-up codes)" : ""}`,
      });
    }
    return NextResponse.json({ campaign, ...r });
  } catch (err) {
    console.error("[cron/weekly-deals] failed", err);
    return NextResponse.json({ error: "Sending stopped; the next run carries on." }, { status: 500 });
  }
}
