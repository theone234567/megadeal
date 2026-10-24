import { incrementCreditsAtomically, setFieldsIf } from "./creditsAtomic";
import { withdrawalRefundsCredit } from "./dealStatus";
import { creditsToRefund } from "./platformSettingsRules";
import { logMerchantActivity } from "./merchantActivity";
import { draftFromSubmission, draftRevisionOf, draftToRow, type DealDraftData } from "./dealDraft";
import type { AiReview } from "./aiReview";
import { isGeneratedDealCode } from "./dealCode";
import type { DealHistoryEntry } from "./dealAdminEdit";

export { MAX_SEND_BACK_NOTE, MIN_SEND_BACK_NOTE, ROUNDS_BEFORE_A_PERSON, SEND_BACK_PRESETS, sendBackMessage, sendBackRounds } from "./dealSendBackRules";

/**
 * "Send back for changes" (security pack T181, with T129): a deal waiting
 * for review goes back to the business's drafts with what to change. The
 * same deal: its id, code and photos stay, the credits it used come back,
 * and the portal shows "Needs a change" with the reason
 * (lib/dealForBusiness.ts). The business fixes it and submits it again,
 * which re-runs the automatic check and puts it back in the queue.
 *
 * Done by the automatic check when it turns a deal down, and by an admin
 * from the deal's page. Rejecting outright (Cancelled) stays separate and
 * final.
 */

const CONTENT_FIELDS = ["dealName", "description", "terms", "photoUrl", "priceNow", "priceWas", "quantityAvailable", "bookingRequirement", "gallery"] as const;

/** A history entry for a moderation round (lib/dealAdminEdit.ts history,
 *  shown on the admin deal page). */
export interface ModerationHistoryEntry extends DealHistoryEntry {
  event: "sent-back" | "resubmitted";
  by?: "admin" | "ai";
  reason?: string;
  /** For "resubmitted": the fields the business changed since it was sent back. */
  changed?: string[];
}


function contentSnapshot(deal: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of CONTENT_FIELDS) out[f] = deal[f] ?? null;
  return out;
}

/** History entry for a resubmission: what changed since it was sent back. */
export function resubmittedEntry(
  draftRow: Record<string, any>,
  submitted: Record<string, any>,
  at: string = new Date().toISOString(),
): ModerationHistoryEntry | null {
  const history = Array.isArray(draftRow.contentHistory) ? draftRow.contentHistory : [];
  const sentBack = history.find((h: { event?: string }) => h?.event === "sent-back") as ModerationHistoryEntry | undefined;
  if (!sentBack || draftRow.aiReview?.returnedToDraft !== true) return null;
  // An empty list, empty text and nothing at all are the same: the row
  // reads an empty gallery back as null.
  const norm = (v: unknown) => (v == null || v === "" || (Array.isArray(v) && v.length === 0) ? null : v);
  const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  const changed = CONTENT_FIELDS.filter((f) => f in submitted && !same(sentBack.previous[f], submitted[f]));
  return { at, event: "resubmitted", previous: Object.fromEntries(changed.map((f) => [f, sentBack.previous[f] ?? null])), changed: [...changed] };
}

export type SendBackResult =
  | { ok: true; item: Record<string, any>; creditsReturned: number }
  | { ok: false; item: Record<string, any> };

/**
 * Moves a deal that is waiting for review back to Draft. Only one request
 * can move it out of review: if the business withdrew it, or an admin
 * decided it, at the same moment, that stands and nothing is sent back.
 */
export async function sendDealBackToDraft(
  adminClient: any,
  deal: Record<string, any>,
  merchant: Record<string, any> | null,
  opts: {
    message: string;
    by: "admin" | "ai";
    /** The automatic check's review, kept for the admin; an admin's own
     *  send-back gets a review-shaped record of its own. */
    review?: AiReview | null;
    presets?: string[];
    category?: string;
    /** The deal as the business submitted it, in the form's shape. */
    submitted?: DealDraftData;
  },
): Promise<SendBackResult> {
  const amount = creditsToRefund(deal);
  const refund = withdrawalRefundsCredit(deal) && amount > 0;
  const claimed = await setFieldsIf(
    adminClient,
    "Deals",
    deal._id,
    { status: "Draft", ...(refund ? { creditRefunded: true } : {}) },
    { status: { $eq: "Pending Approval" } },
  );
  if (!claimed) {
    return { ok: false, item: (await adminClient.items.get("Deals", deal._id)) ?? deal };
  }
  const at = new Date().toISOString();
  // A code MegaDeal generated isn't one the business typed: in the draft's
  // own field it reads as a custom code, which the form refuses. The row
  // keeps it either way (below).
  const draft =
    opts.submitted ??
    draftFromSubmission({
      ...deal,
      category: opts.category ?? deal.category,
      dealCode: isGeneratedDealCode(deal.dealCode) ? "" : deal.dealCode,
    });
  const record =
    opts.by === "ai" && opts.review
      ? { ...opts.review, returnedToDraft: true }
      : {
          verdict: "reject",
          flags: {},
          reasons: opts.presets ?? [],
          messageToBusiness: opts.message,
          model: "admin",
          at,
          returnedToDraft: true,
          by: "admin",
        };
  const entry: ModerationHistoryEntry = { at, event: "sent-back", by: opts.by, reason: opts.message, previous: contentSnapshot(deal) };
  const prior = Array.isArray(deal.contentHistory) ? deal.contentHistory : [];
  const item = await adminClient.items.update("Deals", {
    ...deal,
    ...draftToRow(draft, deal.merchantEmail),
    // The code it was submitted with, whether chosen or generated.
    dealCode: deal.dealCode,
    // Read by the portal (lib/dealForBusiness.ts) for the reason.
    aiReview: record,
    contentHistory: [entry, ...prior].slice(0, 25),
    draftRevision: draftRevisionOf(deal) + 1,
    ...(refund ? { creditRefunded: true } : {}),
  });
  const refunded = refund && merchant?._id ? await incrementCreditsAtomically(adminClient, merchant._id, amount) : false;
  await logMerchantActivity(adminClient, {
    merchantEmail: deal.merchantEmail,
    type: refunded ? "credit" : "deal",
    ...(refunded ? { amount } : {}),
    description: `"${deal.dealName}" needs a change before it can go live${
      refunded ? ` (${amount} credit${amount === 1 ? "" : "s"} returned)` : ""
    }: ${opts.message.trim().replace(/[.!?]+$/, "")}. It's back in your drafts to fix and submit again.`,
  });
  return { ok: true, item, creditsReturned: refunded ? amount : 0 };
}
