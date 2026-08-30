import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getOrClaimMerchant } from "@/lib/merchant";

/**
 * Lets a merchant toggle their own notification preferences. Deliberately
 * separate from /api/merchants/profile: that route sends the business back
 * for review on every save (since it edits public-facing fields) — a
 * notification preference is neither public nor something a save here
 * should ever put a live listing back into "Pending".
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.notifyReferralBonus !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await getOrClaimMerchant(adminClient, member);
    if (!merchant) {
      return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
    }

    const updated = await adminClient.items.update("Merchants", {
      ...merchant,
      notifyReferralBonus: body.notifyReferralBonus,
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[merchants/notifications] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
