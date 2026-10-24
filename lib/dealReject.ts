import { incrementCreditsAtomically, setFieldsIf } from "./creditsAtomic";
import { creditsToRefund } from "./platformSettingsRules";
import { logMerchantActivity } from "./merchantActivity";
import { notifyDealChanged } from "./indexNowDeal";
import { dealRejectedEmail } from "./dealEmails";
import { sendTransactionalEmail } from "./sendEmail";
import { SITE_URL } from "./siteConfig";

export { MAX_REJECT_NOTE, MIN_REJECT_NOTE, REJECT_PRESETS, rejectMessage, rejectedReason } from "./dealRejectRules";

/**
 * An admin rejects a deal (SEO pack T242, the "Reject" of T128): final,
 * with a written reason the business reads in its portal and by email.
 * Kept as Cancelled, with a "rejected" entry in the deal's history holding
 * the reason (lib/dealRejectRules.ts rejectedReason), rather than a new
 * status: Cancelled already means "finished, not on the site" everywhere
 * (listings, sitemap, feeds, the slot it used), so nothing else changes.
 * "Send back for changes" (lib/dealSendBack.ts) stays the fixable outcome.
 *
 * From waiting for review, or live/paused (a deal the automatic check put
 * live). The credits it used come back, once (the default the owner can
 * change: M49).
 */
export const REJECTABLE = ["Pending Approval", "Live", "Paused"];

export async function rejectDeal(
  adminClient: any,
  deal: Record<string, any>,
  merchant: Record<string, any> | null,
  message: string,
): Promise<{ ok: true; item: Record<string, any>; creditsReturned: number; emailed: boolean } | { ok: false }> {
  const amount = creditsToRefund(deal);
  const refund = !deal.creditRefunded && amount > 0;
  // Only if it's still where the admin saw it: a business withdrawing it,
  // or another admin action, at the same moment wins.
  const claimed = await setFieldsIf(
    adminClient,
    "Deals",
    deal._id,
    { status: "Cancelled", ...(refund ? { creditRefunded: true } : {}) },
    { status: { $eq: deal.status } },
  );
  if (!claimed) return { ok: false };
  const at = new Date().toISOString();
  const prior = Array.isArray(deal.contentHistory) ? deal.contentHistory : [];
  const item = await adminClient.items.update("Deals", {
    ...deal,
    status: "Cancelled",
    pausedBy: null,
    // This action's own note, never an earlier one (T242).
    statusNote: message,
    contentHistory: [{ at, event: "rejected", by: "admin", reason: message, previous: {} }, ...prior].slice(0, 25),
    ...(refund ? { creditRefunded: true } : {}),
  });
  if (deal.status === "Live") notifyDealChanged(adminClient, item, merchant);
  const refunded = refund && merchant?._id ? await incrementCreditsAtomically(adminClient, merchant._id, amount) : false;
  await logMerchantActivity(adminClient, {
    merchantEmail: deal.merchantEmail,
    type: refunded ? "credit" : "deal",
    ...(refunded ? { amount } : {}),
    description: `"${deal.dealName}" wasn't approved${refunded ? ` (${amount} credit${amount === 1 ? "" : "s"} returned)` : ""}: ${message}`,
  });
  let emailed = false;
  const to = merchant?.email || deal.merchantEmail;
  if (to) {
    const email = dealRejectedEmail(deal.dealName, message, {
      siteUrl: SITE_URL,
      dealId: deal._id,
      businessName: merchant?.businessName ?? deal.merchantBusinessName,
      contactName: merchant?.contactName ?? deal.merchantContactName,
      creditsReturned: refunded ? amount : 0,
      wasLive: deal.status !== "Pending Approval",
    });
    emailed = await sendTransactionalEmail({
      to,
      subject: email.subject,
      html: email.html,
      replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
    }).catch(() => false);
  }
  return { ok: true, item, creditsReturned: refunded ? amount : 0, emailed };
}
