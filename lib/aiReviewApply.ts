import { decideAiOutcome, limitAiOutcome, reviewWithAi, type AiApplyMode, type AiOutcome, type AiReview } from "./aiReview";
import { withHistory } from "./dealAdminEdit";
import { logMerchantActivity } from "./merchantActivity";
import { DEALS_OPEN } from "./siteConfig";
import { getSiteRudenessCheck, rudenessCheckApplies } from "./rudenessSetting";
import { notifyDealChanged } from "./indexNowDeal";
import { firstPublicationFields } from "./dealDuration";
import type { DealDraftData } from "./dealDraft";
import { sendDealBackToDraft } from "./dealSendBack";
import { emailChangesNeeded } from "./dealSendBackEmail";
import { FALLBACK_CHANGE_NEEDED } from "./dealForBusiness";
import { getPlatformSettings } from "./platformSettings";
import { publishedFieldsFor } from "./dealPublishedFields";

/** The approval switch ("Every deal waits for admin approval", T211), read
 *  fresh. If it can't be read, as if it were on: nothing is published
 *  without a person rather than guessing. */
export async function approvalGate(): Promise<NonNullable<AiReview["gate"]>> {
  try {
    const stored = await getPlatformSettings();
    return { requireApproval: stored.settings.requireApproval, settingsVersion: stored.version };
  } catch (err) {
    console.error("[aiReviewApply] platform settings unavailable; holding for a person", err);
    return { requireApproval: true, settingsVersion: null };
  }
}

/** Whether swearing/crude humour is held back for this business. */
async function rudenessCheckFor(adminClient: any, merchant: Record<string, any> | null): Promise<boolean> {
  return rudenessCheckApplies(await getSiteRudenessCheck(adminClient), merchant?.rudenessCheck);
}

const FALLBACK_REJECTION = FALLBACK_CHANGE_NEEDED;

/**
 * Reviews a submitted deal and acts on the result: publishes it, sends it
 * back to the business as a draft (with the credit returned and the reason
 * shown), or leaves it in "Pending Approval" with the AI's notes for an
 * admin. A deal sent back keeps its id and code, so the business fixes
 * what was asked and submits the same deal again.
 *
 * `apply: "publishOnly"` is the admin's "AI check" button: a clean deal
 * from an approved business goes live, but nothing is turned down — the
 * admin is right there to decide those. `apply: false` only records it.
 *
 * Never throws; a failed review leaves the deal exactly as it was.
 */
export async function reviewSubmittedDeal(
  adminClient: any,
  deal: Record<string, any>,
  merchant: Record<string, any> | null,
  /** true: act on the outcome. "publishOnly": publish but never reject.
   *  "noPublish": reject but never publish (platform setting "every deal
   *  waits for admin approval"). false: review only. */
  opts: {
    category?: string;
    apply: AiApplyMode;
    /** The deal as the business submitted it, in the form's shape; it
     *  becomes the draft if the check sends the deal back. Read off the
     *  deal itself when not given. */
    submitted?: DealDraftData;
    /** The approval switch as the caller read it, kept with the review. */
    gate?: AiReview["gate"];
  }
): Promise<{ outcome: AiOutcome; review: AiReview | null; item: Record<string, any>; creditsReturned?: number }> {
  try {
    const rudenessCheck = await rudenessCheckFor(adminClient, merchant);
    // Every published field, and the plain rules that hold whatever the
    // check says (T207).
    const published = await publishedFieldsFor(deal, merchant);
    const answer = await reviewWithAi({
      ...published.extras,
      allowRudeLanguage: !rudenessCheck,
      kind: "deal",
      dealName: deal.dealName,
      description: deal.description,
      terms: deal.terms,
      priceNow: Number(deal.priceNow),
      priceWas: deal.priceWas != null ? Number(deal.priceWas) : null,
      category: opts.category,
      bookingRequirement: deal.bookingRequirement,
      businessName: merchant?.businessName ?? null,
      photoUrl: deal.photoUrl || null,
      dealCode: deal.dealCode || null,
    });
    if (!answer) return { outcome: "hold", review: null, item: deal };
    const heldFor = [...published.heldFor, ...(answer.heldFor ?? [])];
    const review: AiReview = { ...answer, ...(opts.gate ? { gate: opts.gate } : {}), ...(heldFor.length ? { heldFor } : {}) };

    let outcome = limitAiOutcome(
      opts.apply ? decideAiOutcome(review, merchant?.status === "Approved", rudenessCheck) : "hold",
      opts.apply,
    );
    // Only act on a deal that is still waiting — an admin may have
    // decided it while the review ran (or, for the manual check, earlier).
    const waiting = deal.status === "Pending Approval";

    // Starts the listing's clock (lib/dealDuration.ts). A legacy deal whose
    // promised end date has already passed can't be published without a
    // person setting a new one, so it's held instead.
    const publication = outcome === "publish" && waiting ? firstPublicationFields(deal) : null;
    if (publication?.error) {
      console.warn(`[aiReviewApply] held deal ${deal._id}: ${publication.error}`);
      outcome = "hold";
    }

    if (outcome === "publish" && waiting && publication?.fields) {
      const item = await adminClient.items.update("Deals", {
        ...deal,
        ...publication.fields,
        aiReview: { ...review, autoPosted: true },
        status: "Live",
        everLive: true,
      });
      notifyDealChanged(adminClient, item, merchant);
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: "deal",
        description: DEALS_OPEN
          ? `"${deal.dealName}" is now live`
          : `"${deal.dealName}" is approved — customers will see it from launch day`,
      });
      return { outcome, review, item };
    }

    if (outcome === "reject" && waiting) {
      const sent = await sendDealBackToDraft(adminClient, deal, merchant, {
        message: review.messageToBusiness || FALLBACK_REJECTION,
        by: "ai",
        review,
        category: opts.category,
        submitted: opts.submitted,
      });
      if (sent.ok) await emailChangesNeeded(sent.item, merchant, review.messageToBusiness || FALLBACK_REJECTION, sent.creditsReturned);
      return { outcome, review, item: sent.item, creditsReturned: sent.ok ? sent.creditsReturned : 0 };
    }

    const item = await adminClient.items.update("Deals", { ...deal, aiReview: review });
    return { outcome: "hold", review, item };
  } catch (err) {
    console.error("[aiReviewApply] deal review failed", err);
    return { outcome: "hold", review: null, item: deal };
  }
}

/**
 * Reviews a business's replacement photo for a live deal: swaps it in,
 * turns it down (telling the business why), or leaves it for an admin.
 */
export async function reviewPendingPhoto(
  adminClient: any,
  deal: Record<string, any>,
  merchant: Record<string, any> | null
): Promise<{ outcome: AiOutcome; item: Record<string, any>; message?: string }> {
  try {
    if (!deal.pendingPhotoUrl) return { outcome: "hold", item: deal };
    const rudenessCheck = await rudenessCheckFor(adminClient, merchant);
    // The same review as the deal itself had, with the new photo (T207):
    // judged against the whole deal, not on its own.
    const answer = await reviewWithAi({
      allowRudeLanguage: !rudenessCheck,
      kind: "photo",
      dealName: deal.dealName,
      description: deal.description,
      terms: deal.terms,
      priceNow: deal.priceNow != null ? Number(deal.priceNow) : undefined,
      priceWas: deal.priceWas != null ? Number(deal.priceWas) : null,
      bookingRequirement: deal.bookingRequirement,
      businessName: merchant?.businessName ?? null,
      photoUrl: deal.pendingPhotoUrl,
    });
    if (!answer) return { outcome: "hold", item: deal };
    // With "every deal waits for admin approval" on, a new photo waits for
    // a person too; the current photo stays up meanwhile (T211).
    const review: AiReview = { ...answer, gate: await approvalGate() };
    const outcome = limitAiOutcome(decideAiOutcome(review, merchant?.status === "Approved", rudenessCheck), review.gate?.requireApproval ? "noPublish" : true);

    if (outcome === "publish") {
      const item = await adminClient.items.update("Deals", {
        ...deal,
        photoUrl: deal.pendingPhotoUrl,
        pendingPhotoUrl: null,
        pendingPhotoReview: null,
        contentHistory: withHistory(deal, ["photoUrl"]),
      });
      if (deal.status === "Live") notifyDealChanged(adminClient, item, merchant);
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: "deal",
        description: `New photo for "${deal.dealName}" approved and now showing`,
      });
      return { outcome, item };
    }
    if (outcome === "reject") {
      const item = await adminClient.items.update("Deals", { ...deal, pendingPhotoUrl: null, pendingPhotoReview: null });
      const message = review.messageToBusiness || "Please choose a photo that shows your offer.";
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: "deal",
        description: `New photo for "${deal.dealName}" wasn't approved: ${message}`,
      });
      return { outcome, item, message };
    }
    const item = await adminClient.items.update("Deals", { ...deal, pendingPhotoReview: review });
    return { outcome: "hold", item };
  } catch (err) {
    console.error("[aiReviewApply] photo review failed", err);
    return { outcome: "hold", item: deal };
  }
}
