import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { allowedDealActions } from "@/lib/dealStatus";
import type { DealStatus } from "@/lib/types";

/**
 * Merchant-facing status changes (pause/resume/cancel) go through here
 * instead of a direct client write, so the allowed state-machine
 * transitions are enforced server-side — a merchant can never self-approve
 * a deal out of "Pending Approval" into "Live" no matter what request they
 * craft, because that transition is never in `allowedDealActions`.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const target = body?.status as DealStatus | undefined;
  if (!target) {
    return NextResponse.json({ error: "Missing target status." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const deal = await adminClient.items.get("Deals", params.id);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    if ((deal.merchantEmail || "").toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "This isn't your deal." }, { status: 403 });
    }

    const allowed = allowedDealActions(deal.status ?? "Live").some((a) => a.target === target);
    if (!allowed) {
      return NextResponse.json({ error: "That status change isn't allowed." }, { status: 400 });
    }

    const updated = await adminClient.items.update("Deals", { ...deal, status: target });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[deals/[id]/status] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
