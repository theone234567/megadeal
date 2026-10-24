import { rejectedReason } from "./dealRejectRules";

/**
 * A deal as its own business is sent it by the portal's routes.
 *
 * The automatic check's record (`aiReview`, and `pendingPhotoReview` for a
 * replacement photo) holds the reasons and flags meant for MegaDeal's
 * admins; a business that could read them could learn what the check
 * looks for and word around it. Only the line written for the business
 * goes out, as `changeNeeded`, on a deal the check sent back to Draft,
 * and as `rejectedReason` on one an admin rejected (lib/dealReject.ts).
 */
export const FALLBACK_CHANGE_NEEDED =
  "This deal couldn't be approved as written. Please check the wording and photo are suitable for a family-friendly site and submit it again.";

export function changeNeededFor(deal: Record<string, any> | null | undefined): string | null {
  if (deal?.status !== "Draft") return null;
  const review = deal.aiReview;
  if (!review || typeof review !== "object" || review.returnedToDraft !== true) return null;
  const message = typeof review.messageToBusiness === "string" ? review.messageToBusiness.trim() : "";
  return message || FALLBACK_CHANGE_NEEDED;
}

export function dealForBusiness<T extends Record<string, any> | null | undefined>(deal: T): T {
  if (!deal) return deal;
  const out: Record<string, any> = { ...deal, changeNeeded: changeNeededFor(deal), rejectedReason: rejectedReason(deal) };
  delete out.aiReview;
  delete out.pendingPhotoReview;
  return out as T;
}
