import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { MAX_REJECT_NOTE, MIN_REJECT_NOTE, REJECTABLE, REJECT_PRESETS, rejectDeal, rejectMessage } from "@/lib/dealReject";

/**
 * Admin > a deal > "Reject" (SEO pack T242): final, with the reason the
 * business reads in its portal and by email (lib/dealReject.ts). Body:
 * { presets: ["price", ...], note: "..." }; the note is required. From
 * waiting for review, or live or paused (a deal the automatic check put
 * live). "Send back for changes" stays the fixable outcome.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, MAX_REJECT_NOTE) : "";
  if (note.length < MIN_REJECT_NOTE) {
    return NextResponse.json({ error: "Write why it can't be approved. The business will see it." }, { status: 400 });
  }
  const known = new Set<string>(REJECT_PRESETS.map((p) => p.id));
  const presets = Array.isArray(body?.presets) ? body.presets.filter((p: unknown): p is string => typeof p === "string" && known.has(p)) : [];

  try {
    const adminClient = createDataClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    if (!REJECTABLE.includes(deal.status)) {
      return NextResponse.json({ error: "Only a deal waiting for review, live or paused can be rejected." }, { status: 409 });
    }
    const merchants = deal.merchantEmail
      ? await adminClient.items.query("Merchants").eq("email", deal.merchantEmail).limit(1).find()
      : null;
    const merchant = merchants?.items?.[0] ?? null;
    const message = rejectMessage(presets, note);
    const done = await rejectDeal(adminClient, deal, merchant, message);
    if (!done.ok) {
      return NextResponse.json({ error: "This deal changed just now. Reload to see where it is." }, { status: 409 });
    }
    await logAdminAction({
      action: "Rejected deal",
      target: auditTarget(deal.dealName, deal._id),
      detail: `${presets.length ? `[${presets.join(", ")}] ` : ""}${note}`,
    });
    return NextResponse.json({
      ok: true,
      creditsReturned: done.creditsReturned,
      ...(done.emailed ? {} : { warning: `Rejected, but the email to ${deal.merchantEmail} didn't send.` }),
    });
  } catch (err) {
    console.error("[admin/deals/[id]/reject] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
