import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import {
  MAX_SEND_BACK_NOTE,
  MIN_SEND_BACK_NOTE,
  SEND_BACK_PRESETS,
  sendBackMessage,
  sendDealBackToDraft,
} from "@/lib/dealSendBack";
import { emailChangesNeeded } from "@/lib/dealSendBackEmail";

/**
 * Admin > a deal waiting for review > "Send back for changes" (security
 * pack T181): back to the business's drafts with what to change, the
 * credits it used returned, and an email saying so. Body: { presets:
 * ["photo", ...], note: "..." }; the note is required, because it's what
 * the business reads. Rejecting (Cancelled) stays a separate, final step.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, MAX_SEND_BACK_NOTE) : "";
  if (note.length < MIN_SEND_BACK_NOTE) {
    return NextResponse.json({ error: "Write what the business should change. They'll see it." }, { status: 400 });
  }
  const known = new Set<string>(SEND_BACK_PRESETS.map((p) => p.id));
  const presets = Array.isArray(body?.presets) ? body.presets.filter((p: unknown): p is string => typeof p === "string" && known.has(p)) : [];

  try {
    const adminClient = createDataClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    if (deal.status !== "Pending Approval") {
      return NextResponse.json({ error: "Only a deal waiting for review can be sent back for changes." }, { status: 409 });
    }
    const merchants = deal.merchantEmail
      ? await adminClient.items.query("Merchants").eq("email", deal.merchantEmail).limit(1).find()
      : null;
    const merchant = merchants?.items?.[0] ?? null;
    const message = sendBackMessage(presets, note);
    const sent = await sendDealBackToDraft(adminClient, deal, merchant, { message, by: "admin", presets });
    if (!sent.ok) {
      return NextResponse.json({ error: "This deal was decided or withdrawn just now. Reload to see where it is." }, { status: 409 });
    }
    const emailed = await emailChangesNeeded(sent.item, merchant, message, sent.creditsReturned);
    await logAdminAction({
      action: "Sent back for changes",
      target: auditTarget(deal.dealName, deal._id),
      detail: `${presets.length ? `[${presets.join(", ")}] ` : ""}${note}`,
    });
    return NextResponse.json({
      ok: true,
      ...(emailed ? {} : { warning: `Sent back, but the email to ${deal.merchantEmail} didn't send.` }),
    });
  } catch (err) {
    console.error("[admin/deals/[id]/send-back] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
