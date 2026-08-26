import { randomUUID } from "crypto";
import { createWixAdminClient } from "./wixAdmin";

/**
 * Sends a transactional email via Wix's Email Transmissions API. The sender
 * address doesn't need to be pre-verified — Wix falls back to its own
 * no-reply address and sets ours as reply-to instead, so this works with no
 * extra setup. Counts against the site's Email Marketing quota (Get Account
 * Details shows current usage).
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const adminClient = createWixAdminClient();
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
          replyTo: { emailAddress: "no-reply@megadeal.co.nz" },
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
