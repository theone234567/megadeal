import { decideAiOutcome, reviewWithAi, type AiOutcome, type AiReview } from "./aiReview";
import { incrementCreditsAtomically } from "./creditsAtomic";
import { withdrawalRefundsCredit } from "./dealStatus";
import { withHistory } from "./dealAdminEdit";
import { logMerchantActivity } from "./merchantActivity";
import { SITE_LAUNCHED } from "./siteConfig";
import { getSiteRudenessCheck, rudenessCheckApplies } from "./rudenessSetting";
import { notifyDealChanged } from "./indexNowDeal";
import { firstPublicationFields } from "./dealDuration";

/** Whether swearing/crude humour is held back for this business. */
async function rudenessCheckFor(adminClient: any, merchant: Record<string, any> | null): Promise<boolean> {
  return rudenessCheckApplies(await getSiteRudenessCheck(adminClient), merchant?.rudenessCheck);
}

const FALLBACK_REJECTION =
  "This deal couldn't be approved as written. Please check the wording and photo are suitable for a family-friendly site and submit it again.";

/**
 * Reviews a submitted deal and acts on the result: publishes it, rejects
 * it (with the credit returned and the reason shown to the business), or
 * leaves it in "Pending Approval" with the AI's notes for an admin.
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
  opts: { category?: string; apply: boolean | "publishOnly" }
): Promise<{ outcome: AiOutcome; review: AiReview | null; item: Record<string, any> }> {
  try {
    const rudenessCheck = await rudenessCheckFor(adminClient, merchant);
    const review = await reviewWithAi({
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
    if (!review) return { outcome: "hold", review: null, item: deal };

    let outcome = opts.apply ? decideAiOutcome(review, merchant?.status === "Approved", rudenessCheck) : "hold";
    if (opts.apply === "publishOnly" && outcome === "reject") outcome = "hold";
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
        aiReview: review,
        status: "Live",
        everLive: true,
      });
      notifyDealChanged(adminClient, item, merchant);
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: "deal",
        description: SITE_LAUNCHED
          ? `"${deal.dealName}" is now live`
          : `"${deal.dealName}" is approved — customers will see it from launch day`,
      });
      return { outcome, review, item };
    }

    if (outcome === "reject" && waiting) {
      const refund = withdrawalRefundsCredit(deal);
      const item = await adminClient.items.update("Deals", {
        ...deal,
        aiReview: review,
        status: "Cancelled",
        statusNote: review.messageToBusiness || FALLBACK_REJECTION,
        ...(refund ? { creditRefunded: true } : {}),
      });
      const refunded = refund && merchant?._id ? await incrementCreditsAtomically(adminClient, merchant._id, 1) : false;
      await logMerchantActivity(adminClient, {
        merchantEmail: deal.merchantEmail,
        type: refunded ? "credit" : "deal",
        ...(refunded ? { amount: 1 } : {}),
        description: `"${deal.dealName}" wasn't approved${refunded ? " (credit returned)" : ""}: ${
          review.messageToBusiness || FALLBACK_REJECTION
        }`,
      });
      return { outcome, review, item };
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
    const review = await reviewWithAi({
      allowRudeLanguage: !rudenessCheck,
      kind: "photo",
      dealName: deal.dealName,
      description: deal.description,
      photoUrl: deal.pendingPhotoUrl,
    });
    if (!review) return { outcome: "hold", item: deal };
    const outcome = decideAiOutcome(review, merchant?.status === "Approved", rudenessCheck);

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
