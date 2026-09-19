import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { isWixMediaUrl } from "@/lib/photoUrl";
import { getOrClaimMerchant } from "@/lib/merchant";
import { MAX_BUSINESS_PHOTOS, serializeBusinessPhotos } from "@/lib/businessPhotos";

/** Replaces app/api/merchants/logo/route.ts now that a listing carries up
 *  to MAX_BUSINESS_PHOTOS photos instead of one logo. Saves the whole set
 *  at once (PhotoGalleryField stages adds/removes locally and confirms
 *  once), rather than one add/remove call per photo. */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (await memberRateLimited("merchant-photos", member.id, 20, HOUR)) {
    return NextResponse.json(
      { error: "That's a lot of photo changes at once — please try again in a little while." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const photos = body?.photos;
  if (!Array.isArray(photos) || photos.length === 0 || photos.length > MAX_BUSINESS_PHOTOS) {
    return NextResponse.json(
      { error: `Choose between 1 and ${MAX_BUSINESS_PHOTOS} photos.` },
      { status: 400 }
    );
  }
  if (!photos.every(isWixMediaUrl)) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await getOrClaimMerchant(adminClient, member);
    if (!merchant) {
      return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
    }

    const updated = await adminClient.items.update("Merchants", {
      ...merchant,
      photos: serializeBusinessPhotos(photos),
      // logoUrl stays in sync as the first photo — every place that still
      // shows one small square image (deal cards, the admin dashboard
      // row, JSON-LD) reads this field and is unaffected by the move to
      // a gallery.
      logoUrl: photos[0],
      status: "Pending",
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[merchants/photos] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
