import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";
import { incrementCreditsAtomically } from "@/lib/creditsAtomic";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { escapeHtml } from "@/lib/escapeHtml";

const ALLOWED_STATUSES = ["Pending", "Approved", "Suspended"];
const INTRO_CREDITS = 2;
const REFERRAL_BONUS_CREDITS: number = 2;

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

  // Referral bonus: if this merchant signed up with someone else's referral
  // code, both sides get a bonus once this merchant is approved. The claim
  // itself is an atomic conditional patch (see claimReferralAtomically) so
  // concurrent approve requests for the same merchant can't both succeed.
  if (becomingApproved && existing.couponCode) {
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
      const totalGranted = introGranted + referralBonusGranted;
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
                  referralBonusGranted > 0 ? " (including a referral bonus)" : ""
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
