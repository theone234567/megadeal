import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { getOrClaimMerchant } from "@/lib/merchant";
import { reviewPendingPhoto } from "@/lib/aiReviewApply";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = await getVerifiedMember(req);
  if (!member?.email) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("deal-photo", member.id, 30, HOUR)) {
    return NextResponse.json({ error: "That's a lot of photo changes at once — please try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const photoUrl = body?.photoUrl;
  if (!isWixMediaUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
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
    if (deal.status === "Cancelled") {
      return NextResponse.json({ error: "This deal is cancelled." }, { status: 400 });
    }
    // Drafts change their photo in the deal form, through
    // /api/deals/draft — this route is only for submitted deals.
    if (deal.status === "Draft") {
      return NextResponse.json(
        { error: "This deal is still a draft — open it to make changes." },
        { status: 409 }
      );
    }

    // Not yet public: nobody has seen the old photo, and the whole deal is
    // reviewed at approval anyway, so the new one simply replaces it.
    if (deal.status === "Pending Approval") {
      const updated = await adminClient.items.update("Deals", {
        ...deal,
        photoUrl,
        pendingPhotoUrl: null,
      });
      return NextResponse.json({ item: updated });
    }

    // Live or paused: the new photo waits for an admin to approve it and
    // the current one stays up meanwhile. This used to send the whole deal
    // back to "Pending Approval", taking a live offer off the site until
    // someone reviewed a picture.
    const updated = await adminClient.items.update("Deals", {
      ...deal,
      pendingPhotoUrl: photoUrl,
      pendingPhotoAt: new Date().toISOString(),
    });
    // Checked straight away: a suitable photo from an approved business
    // swaps in now, an unsuitable one is turned down with the reason, and
    // anything unclear waits for an admin with the current photo still up.
    const merchant = await getOrClaimMerchant(adminClient, member);
    const { outcome, item, message } = await reviewPendingPhoto(adminClient, updated, merchant);
    if (outcome === "hold") {
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: "deal",
        description: `New photo for "${deal.dealName || "your deal"}" sent for approval`,
      });
    }
    return NextResponse.json({ item, photoOutcome: outcome, photoMessage: message ?? null });
  } catch (err) {
    console.error("[deals/[id]/photo] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
