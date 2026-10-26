import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { memberRateLimited, HOUR } from "@/lib/memberRateLimit";
import { createDataClient } from "@/lib/dataClient";
import { isUploadedPhotoUrl } from "@/lib/photoUrl";
import { SITE_URL } from "@/lib/siteConfig";
import { getOrClaimMerchant, statusAfterMerchantEdit } from "@/lib/merchant";
import { MAX_BUSINESS_PHOTOS, parseBusinessPhotos, serializeBusinessPhotos } from "@/lib/businessPhotos";
import { merchantForBusiness } from "@/lib/profileReview";

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
  if (!photos.every((p: unknown) => isUploadedPhotoUrl(p, SITE_URL))) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  try {
    const adminClient = createDataClient();
    const merchant = await getOrClaimMerchant(adminClient, member);
    if (!merchant) {
      return NextResponse.json({ error: "No business application found for this account." }, { status: 404 });
    }

    const next = serializeBusinessPhotos(photos);
    // An approved business keeps its page, deals and current photos while
    // new ones wait for a person (T249). Changing them used to send the
    // whole business back to Pending, which took its page and live deals
    // off the site until it was approved again.
    if (merchant.status === "Approved") {
      const waiting = merchant.pendingProfile && typeof merchant.pendingProfile === "object" ? { ...merchant.pendingProfile } : {};
      const unchanged = next === serializeBusinessPhotos(parseBusinessPhotos(merchant.photos));
      if (unchanged) delete waiting.photos;
      else waiting.photos = next;
      const any = Object.keys(waiting).length > 0;
      const held = await adminClient.items.update("Merchants", {
        ...merchant,
        pendingProfile: any ? waiting : null,
        pendingProfileReview: any
          ? merchant.pendingProfileReview ?? { reason: "New photos are looked at by a person before they go on the page.", review: null, at: new Date().toISOString() }
          : null,
        pendingProfileAt: any ? merchant.pendingProfileAt ?? new Date().toISOString() : null,
      });
      // With the database update that adds pending_profile applied, done.
      if (!any || held.pendingProfile) return NextResponse.json({ item: merchantForBusiness(held), held: any ? ["Photos"] : [] });
      console.error("[merchants/photos] pending_profile isn't in the database yet (Admin > System); saved the photos directly");
    }

    const updated = await adminClient.items.update("Merchants", {
      ...merchant,
      photos: next,
      // logoUrl stays in sync as the first photo — every place that still
      // shows one small square image (deal cards, the admin dashboard
      // row, JSON-LD) reads this field and is unaffected by the move to
      // a gallery.
      logoUrl: photos[0],
      status: statusAfterMerchantEdit(merchant, { photos: next }),
    });
    return NextResponse.json({ item: merchantForBusiness(updated) });
  } catch (err) {
    console.error("[merchants/photos] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
