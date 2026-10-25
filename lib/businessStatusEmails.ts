import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { greetingHtml } from "./emailGreeting";
import type { DealEmail } from "./dealEmails";

/**
 * Emails a business gets when an admin sets it to Suspended
 * (app/api/admin/merchants/[id], T246). Before, nothing was sent, so a
 * business turned down or taken off the site only found out by signing
 * in. The admin's reason is required and goes in the email, as with a
 * rejected deal (T242). Being approved again already has its own email
 * ("You're back on MegaDeal").
 */

/** A reason an admin may send: 10 to 600 characters once trimmed. */
export function suspendReasonError(reason: unknown): string | null {
  const text = typeof reason === "string" ? reason.trim() : "";
  if (text.length < 10) return "Say why in a sentence. The business gets this in its email.";
  if (text.length > 600) return "Keep the reason to 600 characters or fewer.";
  return null;
}

export function businessSuspendedEmail(opts: {
  /** Its status before: Pending is an application turned down. */
  from: string;
  reason: string;
  businessName?: string | null;
  contactName?: string | null;
}): DealEmail {
  const business = escapeHtml(opts.businessName || "your business");
  const reason = `<p style="margin:0 0 16px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">${escapeHtml(
    opts.reason.trim().slice(0, 600),
  )}</p>`;
  const greeting = greetingHtml(opts.contactName, opts.businessName);
  if (opts.from === "Pending") {
    return {
      subject: "Your MegaDeal application",
      html: brandedEmailHtml(`
        ${greeting}
        <p style="margin:0 0 16px;">Thanks for applying to list <strong>${business}</strong> on MegaDeal. We're not able to approve it at the moment:</p>
        ${reason}
        <p style="margin:0 0 16px;">If something has changed, or you think we've got this wrong, just reply to this email and we'll take another look.</p>
      `),
    };
  }
  return {
    subject: "Your MegaDeal account has been suspended",
    html: brandedEmailHtml(`
      ${greeting}
      <p style="margin:0 0 16px;">We've suspended <strong>${business}</strong> on MegaDeal, so your listing and deals aren't showing to customers for now:</p>
      ${reason}
      <p style="margin:0 0 16px;">If you have questions, or once this is sorted, just reply to this email.</p>
    `),
  };
}
