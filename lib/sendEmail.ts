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
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  // Optional plain-text alternative. An HTML-only email (no text/plain
  // part at all) is one of the signals spam filters weigh against a
  // message — cheap to avoid, so callers sending anything user-facing
  // should pass one.
  text?: string;
  // The "from" address is a fixed no-reply@ mailbox nobody reads — pass
  // this when the email itself invites a reply (e.g. "hit reply, a real
  // person reads every message"), so that reply actually reaches someone
  // instead of bouncing or vanishing.
  replyTo?: string;
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
      ...(text ? { text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    console.error("[sendTransactionalEmail] failed", await res.text().catch(() => ""));
  }
  return res.ok;
}
