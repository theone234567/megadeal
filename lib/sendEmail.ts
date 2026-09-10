import { randomUUID } from "crypto";
import { createWixAdminClient } from "./wixAdmin";

/**
 * Sends a transactional email via Wix's own Email Transmissions API —
 * genuine Wix-authored infrastructure (adminClient.fetchWithAuth, the same
 * elevated server-only client used everywhere else in this app), not a
 * third-party vendor. Previously switched to Resend because custom-code-
 * triggered Wix emails count against the site's Email Marketing quota
 * (5,000/mo on Core) even though they're transactional — that tradeoff is
 * back in exchange for riding Wix's own established sending domain, which
 * matters a lot for inbox placement: a brand-new custom domain (like the
 * mail.megadeal.co.nz one Resend used) has no sending reputation yet and is
 * far more likely to land in spam than Wix's own long-established infra.
 *
 * The sender address doesn't need to be pre-verified — Wix falls back to
 * its own no-reply address and uses ours as reply-to instead, so this
 * works with no extra domain/DNS setup.
 *
 * Note: unlike Resend, this API has no separate plain-text part — HTML
 * content only.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  // Defaults to no-reply@megadeal.co.nz (Wix requires a replyTo on every
  // transmission). Pass this when the email itself invites a reply — e.g.
  // "hit reply, a real person reads every message" — so that reply
  // actually reaches someone instead of vanishing into a no-reply mailbox.
  replyTo?: string;
}): Promise<boolean> {
  let adminClient;
  try {
    adminClient = createWixAdminClient();
  } catch (err) {
    console.error("[sendTransactionalEmail] Wix admin client not configured.", err);
    return false;
  }

  const res = await adminClient.fetchWithAuth(
    "https://www.wixapis.com/email-transmissions/v1/email-transmissions/send",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailTransmission: {
          emailSubject: subject,
          emailHtmlContent: html,
          senderName: "MegaDeal",
          senderEmailAddress: "no-reply@megadeal.co.nz",
          replyTo: { emailAddress: replyTo || "no-reply@megadeal.co.nz" },
          toRecipients: [{ emailAddress: to }],
          type: "TRANSACTIONAL",
        },
        idempotencyKey: randomUUID(),
      }),
    }
  );

  if (!res.ok) {
    console.error("[sendTransactionalEmail] failed", await res.text().catch(() => ""));
  }
  return res.ok;
}
