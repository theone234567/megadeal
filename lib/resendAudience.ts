/**
 * Keeps Resend's Audience (used for marketing Broadcasts) in sync with
 * EmailSignups verification/unsubscribe state. Best-effort: failures are
 * logged, never thrown, since audience sync shouldn't block the
 * verify/unsubscribe redirect the visitor is waiting on.
 */
async function resendContactsRequest(path: string, init: RequestInit): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("[resendAudience] RESEND_API_KEY / RESEND_AUDIENCE_ID not configured.");
    return;
  }

  const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    console.error("[resendAudience] request failed", await res.text().catch(() => ""));
  }
}

export async function addResendContact(email: string): Promise<void> {
  try {
    await resendContactsRequest("", {
      method: "POST",
      body: JSON.stringify({ email, unsubscribed: false }),
    });
  } catch (err) {
    console.error("[resendAudience] addResendContact failed", err);
  }
}

export async function markResendContactUnsubscribed(email: string): Promise<void> {
  try {
    await resendContactsRequest(`/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: true }),
    });
  } catch (err) {
    console.error("[resendAudience] markResendContactUnsubscribed failed", err);
  }
}
