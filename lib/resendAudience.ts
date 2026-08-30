/**
 * Resend's Audience is the storage for deal-alert signups — no Wix Data
 * involved. Unlike the old best-effort sync, these calls' success is the
 * whole point of the signup route, so failures are returned, not swallowed.
 */
async function resendContactsRequest(path: string, init: RequestInit): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("[resendAudience] RESEND_API_KEY / RESEND_AUDIENCE_ID not configured.");
    return false;
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
  return res.ok;
}

/**
 * Create-or-update: tries creating the contact first, and if that fails
 * (most likely because it already exists — Resend's create endpoint isn't
 * a confirmed idempotent upsert), falls back to updating it by email. This
 * way a repeat signup never fails the whole request the way a duplicate
 * insert into a database with a unique constraint would.
 */
export async function addResendContact(email: string): Promise<boolean> {
  try {
    const created = await resendContactsRequest("", {
      method: "POST",
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (created) return true;

    return await resendContactsRequest(`/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: false }),
    });
  } catch (err) {
    console.error("[resendAudience] addResendContact failed", err);
    return false;
  }
}

export async function markResendContactUnsubscribed(email: string): Promise<boolean> {
  try {
    return await resendContactsRequest(`/${encodeURIComponent(email)}`, {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: true }),
    });
  } catch (err) {
    console.error("[resendAudience] markResendContactUnsubscribed failed", err);
    return false;
  }
}
