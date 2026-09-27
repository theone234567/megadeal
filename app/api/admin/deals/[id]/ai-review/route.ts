import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { reviewSubmittedDeal } from "@/lib/aiReviewApply";

/**
 * Runs the automatic review on one pending deal. A clean deal from an
 * approved business goes live, the same as a new submission; anything the
 * AI isn't happy with stays pending with its notes. It never rejects a
 * deal — the admin decides those. Used for deals submitted before the
 * review existed, or to re-check one.
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
    const { review, item, outcome } = await reviewSubmittedDeal(adminClient, deal, merchants?.items?.[0] ?? null, {
      apply: "publishOnly",
    });
    if (!review) {
      return NextResponse.json({ error: "The AI check didn't respond. Try again in a moment." }, { status: 502 });
    }
    return NextResponse.json({ item, outcome });
  } catch (err) {
    console.error("[admin/deals/[id]/ai-review] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
