import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { canRequestRevision, parseRevisionRequest } from "@/lib/dealRevision";
import { logMerchantActivity } from "@/lib/merchantActivity";

export const dynamic = "force-dynamic";

/**
 * A business asks for changes to one of its submitted deals
 * (lib/dealRevision.ts). Nothing on the deal changes until an admin
 * approves; customers keep seeing it as it is. POST sends (or replaces) the
 * request; DELETE withdraws it.
 */
async function ownDeal(req: NextRequest, id: string) {
  const member = await getVerifiedMember(req);
  if (!member?.email) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  if (await memberRateLimited("deal-revision", member.id, 30, HOUR)) {
    return { error: NextResponse.json({ error: "That's a lot of requests at once — please try again shortly." }, { status: 429 }) };
  }
  const adminClient = createDataClient();
  const deal = await adminClient.items.get("Deals", id).catch(() => null);
  if (!deal) return { error: NextResponse.json({ error: "Deal not found." }, { status: 404 }) };
  if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
    return { error: NextResponse.json({ error: "This isn't your deal." }, { status: 403 }) };
  }
  return { adminClient, deal, member };
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const own = await ownDeal(req, id);
    if (own.error) return own.error;
    const { adminClient, deal } = own;
    if (!canRequestRevision(deal)) {
      return NextResponse.json(
        { error: "Changes can be requested for a deal that's waiting for review, scheduled, live or paused." },
        { status: 409 }
      );
    }
    const { revision, error } = parseRevisionRequest(body, deal);
    if (!revision) return NextResponse.json({ error }, { status: 400 });
    const updated = await adminClient.items.update("Deals", { ...deal, pendingRevision: JSON.stringify(revision) });
    await logMerchantActivity(adminClient, {
      merchantEmail: deal.merchantEmail,
      type: "deal",
      description: `Change requested for "${deal.dealName || "your deal"}" — waiting for review`,
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[deals/revision] failed", err);
    return NextResponse.json({ error: "Couldn't send your request. Please try again." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const own = await ownDeal(req, id);
    if (own.error) return own.error;
    const { adminClient, deal } = own;
    if (!deal.pendingRevision) return NextResponse.json({ error: "There's no change request to withdraw." }, { status: 409 });
    const updated = await adminClient.items.update("Deals", { ...deal, pendingRevision: null });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[deals/revision] withdraw failed", err);
    return NextResponse.json({ error: "Couldn't withdraw your request. Please try again." }, { status: 500 });
  }
}
