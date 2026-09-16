import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllByEmail } from "@/lib/queryAll";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { SITE_URL } from "@/lib/siteConfig";
import { incrementCreditsAtomically } from "@/lib/creditsAtomic";
import { logMerchantActivity } from "@/lib/merchantActivity";
import { escapeHtml } from "@/lib/escapeHtml";
import { brandedEmailHtml } from "@/lib/emailTemplate";
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
// The "up to 6 months free advertising" offer advertised on /list-your-business —
// a business enters this in the same "Referral code" field used for peer
// referrals. It isn't anyone's real referralCode, so it can never collide
// with an actual referral match; the two are handled as separate branches
// below purely for clarity, not because a collision is actually possible.
const PROMO_CODE = "WELCOME6";
const PROMO_CODE_CREDITS = 24;

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

/** Same atomic-claim pattern as claimReferralAtomically, for the WELCOME6
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
  if (!(await isAdminRequest(req))) {
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
  if (!(await isAdminRequest(req))) {
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

  // Credits are deliberately never written through the full-item update
  // further down. That update rewrites every field of the record from a
  // read taken at the top of this request, and credits have a second,
  // independent writer: /api/deals/create debits one atomically the moment
  // a merchant submits a deal. A full-item write would silently hand that
  // spent credit back from the stale read — the merchant gets a free deal
  // and nothing anywhere records why the numbers stopped adding up.
  //
  // So every credit change here is expressed as a delta and applied with
  // INCREMENT_FIELD, which composes with a concurrent debit instead of
  // overwriting it. An explicit number typed by the admin becomes a delta
  // against the balance they were looking at when they typed it: if a deal
  // is submitted in the same moment, the result is the admin's intended
  // change applied on top of that debit, rather than the debit being
  // undone. That is what "set their balance to 5" actually means.
  const adminAdjustDelta = adminSetCredits ? Number(patch.creditsBalance) - existingCredits : 0;
  delete patch.creditsBalance;

  let introGranted = 0;
  let referralBonusGranted = 0;
  let promoGranted = 0;
  let referrer: any = null;
  let referrerCredited = false;

  // Collected non-fatal problems. The merchant record still saves when one
  // of these happens, so they mustn't fail the request — but they also
  // mustn't vanish into server logs, since an admin has no other way to
  // notice that a merchant never got their "you're approved" email or that
  // a credit grant didn't land. Surfaced to the caller as `warnings`.
  const warnings: string[] = [];

  // First-time approval: grant a small number of free introductory credits
  // so a newly-approved merchant can submit a deal straight away, without
  // waiting on a manual top-up. Only kicks in when the admin didn't also
  // set an explicit credits number in this same save (respecting a
  // deliberate manual entry) and the merchant currently has none.
  if (becomingApproved && !adminSetCredits && existingCredits === 0) {
    introGranted = INTRO_CREDITS;
  }

  const enteredCode = String(existing.couponCode || "").trim().toUpperCase();

  // WELCOME6 promo: the "up to 6 months free advertising" offer. Checked
  // first since it's a fixed code, not anyone's real referralCode — if it
  // matches, this signup isn't a peer referral at all.
  if (becomingApproved && enteredCode === PROMO_CODE) {
    if (await claimPromoAtomically(adminClient, existing._id)) {
      promoGranted = PROMO_CODE_CREDITS;
      patch.promoRewarded = true;
    }
  } else if (becomingApproved && enteredCode) {
    // Referral bonus: if this merchant signed up with someone else's referral
    // code, both sides get a bonus once this merchant is approved. The claim
    // itself is an atomic conditional patch (see claimReferralAtomically) so
    // concurrent approve requests for the same merchant can't both succeed.
    //
    // Matched on the upper-cased code, not the raw string the business
    // typed. generateReferralCode only ever produces upper case, and Wix
    // Data's eq() is case-sensitive — so a referrer who told someone their
    // code over the phone, and had it typed back in lower case, simply
    // never got paid. Nothing failed visibly; the bonus just didn't happen.
    const referrerResult = await adminClient.items
      .query("Merchants")
      .eq("referralCode", enteredCode)
      .find();
    const candidate = (referrerResult.items ?? []).find((m: any) => m._id !== existing._id) || null;
    if (candidate && (await claimReferralAtomically(adminClient, existing._id))) {
      referrer = candidate;
      referralBonusGranted = REFERRAL_BONUS_CREDITS;
      patch.referralRewarded = true;
      patch.referredBy = candidate.businessName || candidate.email || null;
      // The referrer isn't part of this record's own patch below, so their
      // credit bump is a separate atomic increment on their own record.
      //
      // Whether it worked matters. The claim above is one-shot — it has
      // already flipped referralRewarded, so this bonus can never be
      // granted again — and the ledger line and the "you earned referral
      // credits" email below would otherwise cheerfully tell the referrer
      // about credits that were never added to their balance.
      referrerCredited = await incrementCreditsAtomically(
        adminClient,
        referrer._id,
        REFERRAL_BONUS_CREDITS
      );
      if (!referrerCredited) {
        warnings.push(
          `Referral bonus for ${referrer.businessName || referrer.email || referrer._id} FAILED to apply. ` +
            `Add ${REFERRAL_BONUS_CREDITS} credits to them manually — this bonus cannot be granted again automatically.`
        );
      }
    }
  }

  // Credits first, then the record. Applying the delta before the
  // full-item update means two things: a grant still lands if the update
  // itself fails (the referral and promo claims above are one-shot, so a
  // lost grant is lost for good), and the update reads back a balance that
  // already includes it instead of writing a stale one straight back over.
  const creditsDelta = adminAdjustDelta + introGranted + referralBonusGranted + promoGranted;
  let creditsApplied = creditsDelta === 0;
  if (creditsDelta !== 0) {
    creditsApplied = await incrementCreditsAtomically(adminClient, existing._id, creditsDelta);
    if (!creditsApplied) {
      warnings.push(
        `Credits were NOT changed (${creditsDelta > 0 ? "+" : ""}${creditsDelta} did not apply). ` +
          `Everything else saved — set the balance again to retry.`
      );
    }
  }

  // Re-read so the full-item update carries the balance as it stands now,
  // including the increment above and the atomic referral/promo claims,
  // rather than the copy read at the top of this request.
  let base = existing;
  try {
    base = (await adminClient.items.get("Merchants", existing._id)) || existing;
  } catch (err) {
    // Falling back to `existing` here would undo the increment that just
    // succeeded: the full-item update below writes every field from this
    // object, and `existing` still holds the balance as it was before.
    // That is the exact bug this ordering exists to prevent, so the
    // fallback carries the balance forward rather than the stale one. It
    // can still lose a debit that landed in the same moment — the narrow
    // window the re-read is there to close — but it cannot lose ours.
    console.error("[admin/merchants] re-read before update failed", err);
    base = creditsApplied
      ? { ...existing, creditsBalance: existingCredits + creditsDelta }
      : existing;
  }

  const updated = await adminClient.items.update("Merchants", {
    ...base,
    ...patch,
  });

  // Every ledger line below is conditioned on creditsApplied: the feed is
  // the merchant's only record of why their balance is what it is, and a
  // line for credits that never arrived makes it worse than having none.
  if (creditsApplied && adminAdjustDelta !== 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: adminAdjustDelta,
      description: "Credits adjusted by admin",
    });
  }
  if (creditsApplied && introGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: introGranted,
      description: "Free intro credits on approval",
    });
  }
  if (creditsApplied && referralBonusGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: referralBonusGranted,
      description: "Referral bonus for signing up with a referral code",
    });
  }
  if (creditsApplied && promoGranted > 0 && existing.email) {
    await logMerchantActivity(adminClient, {
      merchantEmail: existing.email,
      type: "credit",
      amount: promoGranted,
      description: `Promo code ${PROMO_CODE} redeemed — free advertising offer`,
    });
  }

  if (referrer && referrerCredited) {
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
          const referralCreditsLabel = `${REFERRAL_BONUS_CREDITS} bonus deal credit${REFERRAL_BONUS_CREDITS === 1 ? "" : "s"}`;
          await sendTransactionalEmail({
            to: referrerFresh.email,
            subject: "You earned referral credits on MegaDeal!",
            html: brandedEmailHtml(`
              <p style="margin:0 0 16px;">Hi ${safeReferrerName},</p>
              <p style="margin:0 0 16px;">Great news — a business you referred, <strong>${safeReferredName}</strong>, has been approved on MegaDeal. We've added
              ${referralCreditsLabel} to your account. Thanks for spreading the word!</p>
              <p style="margin:0;"><a href="${SITE_URL}/portal" style="color:#7a17f0;font-weight:700;">View your portal</a></p>
            `),
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
      const totalGranted = creditsApplied ? introGranted + referralBonusGranted + promoGranted : 0;
      const safeName = escapeHtml(existing.businessName || "there");
      const creditsNote =
        totalGranted > 0
          ? `We've added ${totalGranted} free deal credit${totalGranted === 1 ? "" : "s"} to your account${
              promoGranted > 0
                ? " (including your WELCOME6 free advertising offer)"
                : referralBonusGranted > 0
                ? " (including a referral bonus)"
                : ""
            } so you can get started right away.`
          : "";
      await sendTransactionalEmail({
        to: existing.email,
        subject: "You're approved! Welcome to MegaDeal",
        html: brandedEmailHtml(`
          <p style="margin:0 0 16px;">Hi ${safeName},</p>
          <p style="margin:0 0 16px;">Good news — your business is approved on MegaDeal. Log in to your
          business portal to submit your first deal:</p>
          <p style="margin:0 0 16px;"><a href="${SITE_URL}/portal" style="color:#7a17f0;font-weight:700;">Go to your portal</a></p>
          ${creditsNote ? `<p style="margin:0;">${creditsNote}</p>` : ""}
        `),
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

/**
 * Permanently removes a business record.
 *
 * Built for clearing out test businesses, which otherwise accumulate and
 * make the dashboard harder to read — and which block their own email
 * from being used to start a fresh application, since getOrClaimMerchant
 * matches on it.
 *
 * Deliberately refuses when the business has any submitted deal. Those
 * carry a Wix Stores product, a spent credit and possibly live traffic;
 * deleting the business under them would leave products with no owner and
 * an audit trail that can't be explained. The admin cancels those first,
 * which is a decision worth making deliberately rather than as a side
 * effect of tidying up.
 *
 * Drafts are removed with it: nothing was charged, nothing was reviewed,
 * nothing was ever public. Activity rows go too, so an email reused for a
 * new application doesn't inherit the previous one's credit history.
 *
 * The business's Wix member login is NOT deleted — that lives in Wix
 * Members, not here. The person can still sign in; they will simply be
 * asked to start an application, which is what makes this useful for
 * reusing a test address.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const merchant = await adminClient.items.get("Merchants", params.id);
    if (!merchant) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const email = String(merchant.email || "");
    let drafts: any[] = [];

    if (email) {
      // Paged and case-tolerant. This guard decides whether deleting the
      // business would orphan live Stores products, and it was reading one
      // default page of 50 under a single casing — so a business with
      // submitted deals past that page, or stored under the other casing,
      // was deleted anyway and its products left published with no owner.
      const all = await queryAllByEmail(
        (e) => adminClient.items.query("Deals").eq("merchantEmail", e),
        email,
        "Deals (delete guard)"
      );
      const submitted = all.filter((d: any) => d.status !== "Draft");
      if (submitted.length > 0) {
        // Cancelling doesn't clear this, and that is deliberate. A
        // submitted deal has a Wix Stores product behind it, and
        // isDealLive treats a product whose Deals row is missing as live
        // (a null status passes) — so deleting these rows here would
        // republish every one of them, cancelled ones included. The only
        // safe order is to remove the deal and its product together in the
        // Wix dashboard, which is what this now says.
        return NextResponse.json(
          {
            error:
              `This business has ${submitted.length} submitted deal${
                submitted.length === 1 ? "" : "s"
              }. Those have live Stores products behind them, and removing the deal ` +
              `records alone would put the products back on the site. Delete them in ` +
              `the Wix dashboard first — Content Manager → Deals, and Stores → Products ` +
              `— then delete the business here.`,
          },
          { status: 409 }
        );
      }
      drafts = all;
    }

    for (const draft of drafts) {
      await adminClient.items.remove("Deals", draft._id);
    }

    if (email) {
      // Paged, because an unbounded find() returns one default page and a
      // busy ledger is longer than that — leaving the remainder behind,
      // which is exactly the inherited credit history this exists to
      // prevent. Bounded so a runaway query can't loop forever.
      const activity = await queryAllByEmail(
        (e) => adminClient.items.query("MerchantActivity").eq("merchantEmail", e),
        email,
        "MerchantActivity (delete)"
      );
      for (const row of activity) {
        await adminClient.items.remove("MerchantActivity", row._id);
      }
    }

    await adminClient.items.remove("Merchants", params.id);
    return NextResponse.json({ ok: true, deletedDrafts: drafts.length });
  } catch (err) {
    console.error("[admin/merchants/[id]] DELETE failed", err);
    // Says "partly" on purpose: this removes drafts, then activity, then
    // the business, and Wix Data has no transaction across them. A failure
    // halfway leaves real deletions behind it, and telling the admin
    // nothing happened would be false.
    return NextResponse.json(
      {
        error:
          "Couldn't finish deleting that business — some of its drafts or history may " +
          "already be gone. Reload and check before trying again.",
      },
      { status: 500 }
    );
  }
}
