import { randomUUID } from "crypto";
import { createWixAdminClient } from "./wixAdmin";
import { emailHtmlToText, headerSafe } from "./emailText";

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

/**
 * Sends one email: through Resend from megadeal.co.nz when
 * EMAIL_PROVIDER=resend (wrangler.toml; on since Oct 2026, see
 * sendWithResend below), otherwise through Wix's Email Transmissions API.
 *
 * Wix is kept as the way back: removing the switch and deploying sends
 * through it again at once. Its emails count against the site's Wix email
 * quota (5,000 a month on Core), go out from Wix's own sending domain with
 * ours as the reply-to, and have no plain-text part.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  replyTo,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  html: string;
  // Defaults to no-reply@megadeal.co.nz (Wix requires a replyTo on every
  // transmission). Pass this when the email itself invites a reply — e.g.
  // "hit reply, a real person reads every message" — so that reply
  // actually reaches someone instead of vanishing into a no-reply mailbox.
  replyTo?: string;
  /** For mailing-list email: the one-click unsubscribe address, sent as
   *  the List-Unsubscribe header (Gmail and Yahoo require it of senders
   *  like us). Leave out for one-off messages (receipts, password resets). */
  unsubscribeUrl?: string;
}): Promise<boolean> {
  // One address, or a few separated by commas (ADMIN_NOTIFY_EMAIL may
  // list several). Each must be a plain address: nothing that could add
  // recipients or headers of its own.
  const recipients = headerSafe(to, 1000)
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);
  const safeSubject = headerSafe(subject);
  const safeReplyTo = replyTo ? headerSafe(replyTo, 320) : undefined;
  if (!recipients.length || !recipients.every((a) => EMAIL_RE.test(a)) || (safeReplyTo && !EMAIL_RE.test(safeReplyTo))) {
    console.error("[sendTransactionalEmail] refused: not an email address");
    return false;
  }
  if (process.env.EMAIL_PROVIDER === "resend") {
    return sendWithResend({ to: recipients, subject: safeSubject, html, replyTo: safeReplyTo, unsubscribeUrl });
  }
  subject = safeSubject;
  replyTo = safeReplyTo;

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
          toRecipients: recipients.map((emailAddress) => ({ emailAddress })),
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

/**
 * MegaDeal's own sending (EMAIL_PROVIDER=resend, RESEND_API_KEY), from
 * EMAIL_FROM (default "MegaDeal <no-reply@megadeal.co.nz>"). The domain
 * is verified with Resend and carries its SPF and DKIM records and a DMARC
 * record (docs/WIX-MIGRATION.md, Stage 1). A new sending domain starts
 * with no reputation, so volume should stay low for its first weeks.
 */
async function sendWithResend(msg: { to: string[]; subject: string; html: string; replyTo?: string; unsubscribeUrl?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[sendTransactionalEmail] EMAIL_PROVIDER=resend but RESEND_API_KEY isn't set");
    return false;
  }
  const headers: Record<string, string> = {};
  if (msg.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${msg.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "MegaDeal <no-reply@megadeal.co.nz>",
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: emailHtmlToText(msg.html),
        reply_to: msg.replyTo || undefined,
        headers: Object.keys(headers).length ? headers : undefined,
      }),
    });
    if (!res.ok) {
      // The provider's answer, never the message or the address.
      console.error("[sendTransactionalEmail] Resend refused", res.status, (await res.text().catch(() => "")).slice(0, 300));
    }
    return res.ok;
  } catch (err) {
    console.error("[sendTransactionalEmail] Resend unreachable", err);
    return false;
  }
}
