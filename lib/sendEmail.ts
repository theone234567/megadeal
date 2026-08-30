/**
 * Sends a transactional email via Resend. Switched from Wix's Email
 * Transmissions API (see git history) because custom-code-triggered Wix
 * emails count against the site's Email Marketing quota (5,000/mo on Core)
 * even though they're transactional, not marketing — Resend's free tier
 * (3,000/mo) covers this app's verification/notification volume for free.
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[sendTransactionalEmail] RESEND_API_KEY is not configured.");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MegaDeal <no-reply@mail.megadeal.co.nz>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[sendTransactionalEmail] failed", await res.text().catch(() => ""));
  }
  return res.ok;
}
