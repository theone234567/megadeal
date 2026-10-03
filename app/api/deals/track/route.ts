import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { incrementFieldAtomically } from "@/lib/creditsAtomic";
import { isAdminRequest } from "@/lib/adminSession";
import { DEAL_EVENT_FIELD, isDealEvent } from "@/lib/dealEvents";

export const dynamic = "force-dynamic";

/**
 * Best-effort, anonymous counters for merchant-facing deal analytics:
 * views, the visit's one "interest" (clickCount), and each "Get this
 * deal" action separately (lib/dealEvents.ts). Not auth-gated (it just increments a counter keyed by the
 * public product id) and not precision-critical, so a lost or duplicated
 * increment under a race is an acceptable tradeoff for staying simple —
 * this never blocks or fails a request from the visitor's point of view.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId = body?.productId ? String(body.productId) : "";
  const event = body?.event;

  if (!productId || !isDealEvent(event)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // An admin checking a deal isn't a customer: not counted.
  if (await isAdminRequest(req)) {
    return NextResponse.json({ ok: true });
  }

  // The last unauthenticated write endpoint without a ceiling. Every call
  // costs two Wix API calls (a query then an update), so an unbounded one
  // is both a quota drain and a way to fabricate the view/click numbers
  // merchants are shown in their analytics — the counters are the whole
  // product for them, so inflating a rival's (or one's own) is a real
  // incentive, not a theoretical one.
  //
  // 300/hour per IP is far above genuine browsing — a visitor who opened
  // 150 deals in an hour and clicked every one would still fit — but well
  // under what a script needs to move a number noticeably.
  //
  // Returns the same ok:true as every other path rather than a 429: this
  // is fire-and-forget analytics that must never affect what the visitor
  // sees, and a 429 would only tell an abuser exactly where the line is.
  const { limited } = await checkRateLimit(`dealstrack-ip:${getClientIp(req)}`, 300, 60 * 60);
  if (limited) {
    return NextResponse.json({ ok: true });
  }

  try {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items.query("Deals").eq("productId", productId).find();
    const record = result.items?.[0];
    if (!record) {
      // Legacy/admin-managed products have no Deals row to track against.
      return NextResponse.json({ ok: true });
    }

    // Incremented in place. This used to re-save the whole row read a
    // moment earlier, so a page view landing just as an admin paused,
    // edited or approved the deal could write the old version back over
    // the change.
    // An action can also be the visit's first sign of interest; both
    // counters move in the one patch.
    const fields = [DEAL_EVENT_FIELD[event]];
    if (body?.firstInterest === true && event !== "view" && event !== "click") fields.push(DEAL_EVENT_FIELD.click);
    await incrementFieldAtomically(adminClient, "Deals", record._id, fields, 1);
  } catch (err) {
    console.error("[deals/track] failed", err);
  }

  return NextResponse.json({ ok: true });
}
