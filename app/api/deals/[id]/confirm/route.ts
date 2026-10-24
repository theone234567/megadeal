import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { dealDisplayStatus } from "@/lib/dealStatus";
import { dealForBusiness } from "@/lib/dealForBusiness";

/**
 * "Still running as listed": the business confirms a live deal is still
 * exactly as its page says. Records the time (merchantConfirmedAt), which
 * the deal page, its structured data and the public feed show as when the
 * deal was last checked (lib/dealVerification.ts). Changes nothing a
 * customer sees about the deal itself, so it needs no review.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  if (await memberRateLimited("deal-confirm", member.id, 30, HOUR)) {
    return NextResponse.json({ error: "That's a lot of confirmations at once — please try again shortly." }, { status: 429 });
  }

  try {
    const client = createDataClient();
    const deal = await client.items.get("Deals", params.id);
    if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your deal." }, { status: 403 });
    }
    if (dealDisplayStatus({ status: deal.status, expiresAt: deal.expiresAt }) !== "Live") {
      return NextResponse.json({ error: "Only a live deal can be confirmed." }, { status: 409 });
    }
    const updated = await client.items.update("Deals", { ...deal, merchantConfirmedAt: new Date().toISOString() });
    // Before the database update that adds the column, the write is
    // quietly dropped: say so rather than pretend it was recorded.
    if (!updated?.merchantConfirmedAt) {
      return NextResponse.json({ error: "Confirming deals isn't switched on yet. Please try again later." }, { status: 503 });
    }
    return NextResponse.json({ item: dealForBusiness(updated) });
  } catch (err) {
    console.error("[deals/[id]/confirm] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
