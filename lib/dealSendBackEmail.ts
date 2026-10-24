import { dealChangesNeededEmail } from "./dealEmails";
import { sendTransactionalEmail } from "./sendEmail";
import { SITE_URL } from "./siteConfig";

/** Emails the business that its deal was sent back for changes. Never
 *  throws: the deal is already back in its drafts with the reason. */
export async function emailChangesNeeded(
  deal: Record<string, any>,
  merchant: Record<string, any> | null,
  reason: string,
  creditsReturned = 0,
): Promise<boolean> {
  const to = merchant?.email || deal.merchantEmail;
  if (!to) return false;
  const email = dealChangesNeededEmail(deal.dealName, reason, {
    siteUrl: SITE_URL,
    draftId: deal._id,
    businessName: merchant?.businessName ?? deal.merchantBusinessName,
    contactName: merchant?.contactName ?? deal.merchantContactName,
    creditsReturned,
  });
  const sent = await sendTransactionalEmail({
    to,
    subject: email.subject,
    html: email.html,
    // "Just reply": to a person.
    replyTo: process.env.ADMIN_NOTIFY_EMAIL || undefined,
  }).catch(() => false);
  if (!sent) console.error("[dealSendBack] changes-needed email not sent");
  return sent;
}
