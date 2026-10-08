import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { getSiteRudenessCheck, setSiteRudenessCheck } from "@/lib/rudenessSetting";
import { getRateLimitKv } from "@/lib/rateLimit";
import { AI_REVIEW_LAST_KEY } from "@/lib/kvMarkers";

/** How the AI deal check last went, or null if it hasn't run (lib/aiReview.ts). */
async function aiReviewStatus(): Promise<{ configured: boolean; last: { at: string; ok: boolean; problem?: string } | null }> {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  try {
    const raw = await (await getRateLimitKv())?.get(AI_REVIEW_LAST_KEY);
    return { configured, last: raw ? JSON.parse(raw) : null };
  } catch {
    return { configured, last: null };
  }
}

/** Site-wide admin settings (the rudeness check), and how the AI deal check is doing. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminClient = createDataClient();
  return NextResponse.json({ rudenessCheck: await getSiteRudenessCheck(adminClient), aiReview: await aiReviewStatus() });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.rudenessCheck !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const adminClient = createDataClient();
    await setSiteRudenessCheck(adminClient, body.rudenessCheck);
    await logAdminAction({ action: "Setting changed", detail: `Rudeness check ${body.rudenessCheck ? "on" : "off"}` });
    return NextResponse.json({ rudenessCheck: body.rudenessCheck });
  } catch (err) {
    console.error("[admin/settings] save failed", err);
    return NextResponse.json({ error: "Couldn't save the setting. Please try again." }, { status: 500 });
  }
}
