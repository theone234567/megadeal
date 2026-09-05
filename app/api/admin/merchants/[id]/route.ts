import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";
import { incrementCreditsAtomically } from "@/lib/creditsAtomic";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { escapeHtml } from "@/lib/escapeHtml";
import { isValidSocialUrl, isSafeOptionalUrl } from "@/lib/socialLinks";
import { isValidNzbnFormat, normalizeNzbn } from "@/lib/nzbn";

const ALLOWED_STATUSES = ["Pending", "Approved", "Suspended"];
const ALLOWED_PRICE_RANGES = ["", "$", "$$", "$$$", "$$$$"];
const MAX_TEXT_LENGTH = 300;
// See apply/route.ts — businessHours is a structured-hours JSON blob, not
// a single-line field, so it needs its own generous length cap.
const MAX_BUSINESS_HOURS_LENGTH = 4000;
const MAX_BIO_LENGTH = 600;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

const INTRO_CREDITS = 2;
const REFERRAL_BONUS_CREDITS: number = 2;
// The "up to 3 months free advertising" offer advertised on /businesses —
// a business enters this in the same "Referral code" field used for peer
// referrals. It isn't anyone's real referralCode, so it can never collide
// with an actual referral match; the two are handled as separate branches
// below purely for clarity, not because a collision is actually possible.
const PROMO_CODE = "WELCOME3";
const PROMO_CODE_CREDITS = 12;

/**
 * Atomically flips referralRewarded from not-true to true, server-side,
 * conditioned on it still being not-true at the moment the write lands.
 * Two concurrent approve requests for the same merchant will only ever
 * have one of these calls succeed — the loser sees res.ok === false and
 * must not grant the referral bonus. A plain read-then-write (checking
 * existing.referralRewarded in JS, then items.update()) can't guarantee
 * that: both requests could read "not yet rewarded" before either write
 * lands, double-crediting the referrer.
 */
async function claimReferralAtomically(adminClient: any, merchantId: string): Promise<boolean> {
  try {
    const res = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/wix-data/v2/items/${merchantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataCollectionId: "Merchants",
          patch: {
            dataItemId: merchantId,
            fieldModifications: [
              { fieldPath: "referralRewarded", action: "SET_FIELD", setFieldOptions: { value: true } },
            ],
          },
          condition: { filter: { referralRewarded: { $ne: true } } },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Same atomic-claim pattern as claimReferralAtomically, for the WELCOME3
 * promo — stops a merchant being re-approved after a later suspension (or
 * two concurrent approve requests) from granting the promo credits twice. */
async function claimPromoAtomically(adminClient: any, merchantId: string): Promise<boolean> {
  try {
    const res = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/wix-data/v2/items/${merchantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataCollectionId: "Merchants",
          patch: {
            dataItemId: merchantId,
            fieldModifications: [
              { fieldPath: "promoRewarded", action: "SET_FIELD", setFieldOptions: { value: true } },
            ],
          },
          condition: { filter: { promoRewarded: { $ne: true } } },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const adminClient = createWixAdminClient();
    const item = await adminClient.items.get("Merchants", params.id);
    if (!item) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[admin/merchants/[id]] GET failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.creditsBalance !== undefined) {
    const credits = Number(body.creditsBalance);
    if (!Number.isFinite(credits) || credits < 0) {
      return NextResponse.json({ error: "Invalid credits balance." }, { status: 400 });
    }
    patch.creditsBalance = credits;
  }
  if (body.rating !== undefined) {
    if (body.rating === null || body.rating === "") {
      patch.rating = null;
    } else {
      const rating = Number(body.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        return NextResponse.json({ error: "Rating must be between 0 and 5." }, { status: 400 });
      }
      patch.rating = rating;
    }
  }
  if (body.reviewCount !== undefined) {
    if (body.reviewCount === null || body.reviewCount === "") {
      patch.reviewCount = null;
    } else {
      const reviewCount = Number(body.reviewCount);
      if (!Number.isFinite(reviewCount) || reviewCount < 0) {
        return NextResponse.json({ error: "Invalid review count." }, { status: 400 });
      }
      patch.reviewCount = reviewCount;
    }
  }
  // Profile-detail corrections — admin fixing a typo or filling in something
  // a business got wrong, not the merchant's own self-edit (which sends the
  // listing back to "Pending" for re-review). An admin edit is trusted, so
  // it doesn't touch status. Same validation as the merchant-facing
  // /api/merchants/profile route, since this writes to the same fields.
  if (body.businessName !== undefined) {
    const v = cleanText(body.businessName, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Business name can't be empty." }, { status: 400 });
    patch.businessName = v;
  }
  if (body.legalBusinessName !== undefined) {
    const v = cleanText(body.legalBusinessName, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Legal business name can't be empty." }, { status: 400 });
    patch.legalBusinessName = v;
  }
  if (body.contactName !== undefined) {
    const v = cleanText(body.contactName, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Contact name can't be empty." }, { status: 400 });
    patch.contactName = v;
  }
  if (body.contactPhone !== undefined) {
    const v = cleanText(body.contactPhone, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Contact phone can't be empty." }, { status: 400 });
    patch.contactPhone = v;
  }
  if (body.nzbn !== undefined) {
    const v = normalizeNzbn(body.nzbn);
    if (!isValidNzbnFormat(v)) {
      return NextResponse.json({ error: "NZBN must be 13 digits." }, { status: 400 });
    }
    patch.nzbn = v;
  }
  if (body.phone !== undefined) {
    const v = cleanText(body.phone, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Phone can't be empty." }, { status: 400 });
    patch.phone = v;
  }
  if (body.address !== undefined) {
    const v = cleanText(body.address, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "Address can't be empty." }, { status: 400 });
    patch.address = v;
  }
  if (body.city !== undefined) {
    const v = cleanText(body.city, MAX_TEXT_LENGTH);
    if (!v) return NextResponse.json({ error: "City can't be empty." }, { status: 400 });
    patch.city = v;
  }
  if (body.postcode !== undefined) patch.postcode = cleanText(body.postcode, 20);
  if (body.website !== undefined) {
    const v = cleanText(body.website, MAX_TEXT_LENGTH);
    if (!isSafeOptionalUrl(v)) {
      return NextResponse.json({ error: "Enter a valid website address." }, { status: 400 });
    }
    patch.website = v;
  }
  if (body.bio !== undefined) patch.bio = cleanText(body.bio, MAX_BIO_LENGTH);
  if (body.businessHours !== undefined) patch.businessHours = cleanText(body.businessHours, MAX_BUSINESS_HOURS_LENGTH);
  if (body.bookingUrl !== undefined) {
    const v = cleanText(body.bookingUrl, MAX_TEXT_LENGTH);
    if (!isSafeOptionalUrl(v)) {
      return NextResponse.json({ error: "Enter a valid booking link." }, { status: 400 });
    }
    patch.bookingUrl = v;
  }
  if (body.bookingEmail !== undefined) {
    const v = cleanText(body.bookingEmail, MAX_TEXT_LENGTH);
    if (v && !EMAIL_RE.test(v)) {
      return NextResponse.json({ error: "Enter a valid booking email." }, { status: 400 });
    }
    patch.bookingEmail = v;
  }
  if (body.facebookUrl !== undefined) {
    const v = cleanText(body.facebookUrl, MAX_TEXT_LENGTH);
    if (!isValidSocialUrl(v, "facebook")) {
      return NextResponse.json(
        { error: "Enter a valid Facebook page URL (e.g. facebook.com/yourbusiness)." },
        { status: 400 }
      );
    }
    patch.facebookUrl = v;
  }
  if (body.instagramUrl !== undefined) {
    const v = cleanText(body.instagramUrl, MAX_TEXT_LENGTH);
    if (!isValidSocialUrl(v, "instagram")) {
      return NextResponse.json(
        { error: "Enter a valid Instagram profile URL (e.g. instagram.com/yourbusiness)." },
        { status: 400 }
      );
    }
    patch.instagramUrl = v;
  }
  if (body.priceRange !== undefined) {
    const v = cleanText(body.priceRange, 4);
    if (!ALLOWED_PRICE_RANGES.includes(v)) {
      return NextResponse.json({ error: "Invalid price range." }, { status: 400 });
    }
    patch.priceRange = v;
  }
  if (body.amenities !== undefined) patch.amenities = cleanText(body.amenities, MAX_TEXT_LENGTH);
  if (body.lat !== undefined) patch.lat = Number.isFinite(body.lat) ? Number(body.lat) : null;
  if (body.lng !== undefined) patch.lng = Number.isFinite(body.lng) ? Number(body.lng) : null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
  const adminClient = createWixAdminClient();
  const existing = await adminClient.items.get("Merchants", params.id);
  if (!existing) {
    return NextResponse.json({ error: "Merchant not found." }, { status: 404 });
  }

  const becomingApproved = patch.status === "Approved" && existing.status !== "Approved";
  const adminSetCredits = patch.creditsBalance !== undefined;
  const existingCredits = Number(existing.creditsBalance) || 0;

  // Base credits: whatever the admin explicitly set this save, or the
  // existing balance if they left it untouched. Captured before newCredits
  // picks up intro/referral additions below, so the ledger entry only
  // reflects the admin's own manual adjustment, not those.
  let newCredits = adminSetCredits ? patch.creditsBalance : existingCredits;
  const adminAdjustDelta = adminSetCredits ? patch.creditsBalance - existingCredits : 0;
  let introGranted = 0;
  let referralBonusGranted = 0;
  let promoGranted = 0;
  let referrer: any = null;

  // First-time approval: grant a small number of free introductory credits
  // so a newly-approved merchant can submit a deal straight away, without
  // waiting on a manual top-up. Only kicks in when the admin didn't also
  // set an explicit credits number in this same save (respecting a
  // deliberate manual entry) and the merchant currently has none.
  if (becomingApproved && !adminSetCredits && existingCredits === 0) {
    introGranted = INTRO_CREDITS;
    newCredits += introGranted;
  }

  const enteredCode = String(existing.couponCode || "").trim().toUpperCase();

  // WELCOME3 promo: the "up to 3 months free advertising" offer. Checked
  // first since it's a fixed code, not anyone's real referralCode — if it
  // matches, this signup isn't a peer referral at all.
  if (becomingApproved && enteredCode === PROMO_CODE) {
    if (await claimPromoAtomically(adminClient, existing._id)) {
      promoGranted = PROMO_CODE_CREDITS;
      newCredits += promoGranted;
      patch.promoRewarded = true;
    }
  } else if (becomingApproved && existing.couponCode) {
    // Referral bonus: if this merchant signed up with someone else's referral
    // code, both sides get a bonus once this merchant is approved. The claim
    // itself is an atomic conditional patch (see claimReferralAtomically) so
    // concurrent approve requests for the same merchant can't both succeed.
    const referrerResult = await adminClient.items
      .query("Merchants")
      .eq("referralCode", existing.couponCode)
      .find();
    const candidate = (referrerResult.items ?? []).find((m: any) => m._id !== existing._id) || null;
    if (candidate && (await claimReferralAtomically(adminClient, existing._id))) {
      referrer = candidate;
      referralBonusGranted = REFERRAL_BONUS_CREDITS;
      newCredits += referralBonusGranted;
      patch.referralRewarded = true;
      patch.referredBy = candidate.businessName || candidate.email || null;
      // The referrer isn't part of this record's own patch below, so their
      // credit bump is a separate atomic increment on their own record.
      await incrementCreditsAtomically(adminClient, referrer._id, REFERRAL_BONUS_CREDITS);
    }
  }

  if (becomingApproved || adminSetCredits) {
    patch.creditsBalance = newCredits;
  }

  const updated = await adminClient.items.update("Merchants", {
    ...existing,
    ...patch,
  });

  // Collected non-fatal problems from here on: the merchant record itself
  // already saved successfully above, so a notification failure shouldn't
  // fail the request — but it also shouldn't vanish into server logs only,
  // since an admin has no other way to notice a merchant never got their
  // "you're approved" email. Surfaced to the caller as `warnings`.
  const warnings: string[] = [];

  if (adminAdjustDelta !== 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: adminAdjustDelta,
      description: "Credits adjusted by admin",
    });
  }
  if (introGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: introGranted,
      description: "Free intro credits on approval",
    });
  }
  if (referralBonusGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: referralBonusGranted,
      description: "Referral bonus for signing up with a referral code",
    });
  }
  if (promoGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: promoGranted,
      description: `Promo code ${PROMO_CODE} redeemed — free advertising offer`,
    });
  }

  if (referrer) {
    let referrerFresh: any = null;
    try {
      referrerFresh = await adminClient.items.get("Merchants", referrer._id);
    } catch (err) {
      console.error("[admin/merchants] fetching referrer failed", err);
      warnings.push(`Couldn't load referrer details for the credit notification email.`);
    }
    if (referrerFresh?.email) {
      await logMerchantActivity(adminClient, {
        merchantEmail: referrerFresh.email,
        type: "credit",
        amount: REFERRAL_BONUS_CREDITS,
        description: `Referral bonus for referring "${existing.businessName || "a new business"}"`,
      });
      // Referral bonus emails are the one notification a merchant can opt
      // out of (notifyReferralBonus) — the credit and ledger entry above
      // always happen regardless, only this email is conditional.
      if (referrerFresh.notifyReferralBonus !== false) {
        try {
          // Both names here are merchant-supplied — existing.businessName is
          // the *referred* business's own choice of name, which this email
          // sends to a completely different merchant (the referrer). Escape
          // both, not just the recipient's own.
          const safeReferrerName = escapeHtml(referrerFresh.businessName || "there");
          const safeReferredName = escapeHtml(existing.businessName || "a new business");
          await sendTransactionalEmail({
            to: referrerFresh.email,
            subject: "You earned referral credits on MegaDeal!",
            html: `
              <p>Hi ${safeReferrerName},</p>
              <p>Great news — a business you referred, <strong>${safeReferredName}</strong>, has been approved on MegaDeal. We've added
              ${REFERRAL_BONUS_CREDITS} bonus deal credit${
              REFERRAL_BONUS_CREDITS === 1 ? "" : "s"
            } to your account. Thanks for spreading the word!</p>
              <p><a href="${SITE_URL}/portal">View your portal</a></p>
            `,
          });
        } catch (err) {
          console.error("[admin/merchants] referral bonus email failed", err);
          warnings.push(`Referral bonus was credited, but the notification email to ${referrerFresh.email} failed to send.`);
        }
      }
    }
  }

  if (becomingApproved && existing.email) {
    try {
      const totalGranted = introGranted + referralBonusGranted + promoGranted;
      const safeName = escapeHtml(existing.businessName || "there");
      await sendTransactionalEmail({
        to: existing.email,
        subject: "You're approved! Welcome to MegaDeal",
        html: `
          <p>Hi ${safeName},</p>
          <p>Good news — your business is approved on MegaDeal. Log in to your
          business portal to submit your first deal:</p>
          <p><a href="${SITE_URL}/portal">Go to your portal</a></p>
          ${
            totalGranted > 0
              ? `<p>We've added ${totalGranted} free deal credit${
                  totalGranted === 1 ? "" : "s"
                } to your account${
                  promoGranted > 0
                    ? " (including your WELCOME3 free advertising offer)"
                    : referralBonusGranted > 0
                    ? " (including a referral bonus)"
                    : ""
                } so you can get started right away.</p>`
              : ""
          }
        `,
      });
    } catch (err) {
      console.error("[admin/merchants] approval email failed", err);
      warnings.push(`Merchant was approved, but the notification email to ${existing.email} failed to send.`);
    }
  }

  return NextResponse.json({ item: updated, warnings });
  } catch (err) {
    console.error("[admin/merchants/[id]] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
