import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { reviewSubmittedDeal } from "@/lib/aiReviewApply";

/**
 * Runs the automatic review on one deal and records the result — advice
 * only. It never publishes or rejects anything; the admin decides. Used to
 * check deals submitted before the review existed, or to re-check one.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI review isn't set up yet — add ANTHROPIC_API_KEY in Cloudflare." },
      { status: 503 }
    );
  }

  try {
    const adminClient = createWixAdminClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    const merchants = deal.merchantEmail
      ? await adminClient.items.query("Merchants").eq("email", deal.merchantEmail).limit(1).find()
      : null;
    const { review, item } = await reviewSubmittedDeal(adminClient, deal, merchants?.items?.[0] ?? null, {
      apply: false,
    });
    if (!review) {
      return NextResponse.json({ error: "The AI check didn't respond. Try again in a moment." }, { status: 502 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[admin/deals/[id]/ai-review] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
