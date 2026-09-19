import { createWixClient } from "./wixClient";

// No 0/O/1/l/I — easy to read aloud or over the phone without ambiguity.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length];
  return out;
}

/**
 * Sets a member's password directly, entirely server-side — no email, no
 * Wix-hosted page. Mints the member a session via an admin-authorized Sign
 * On (proves control of the account via WIX_API_KEY, not the member's
 * password), exchanges it for real member tokens, then calls Change
 * Password exactly as the member would from a "change password" screen.
 *
 * Two callers: adminResetMemberPassword below (an admin picks the business,
 * we pick the password) and the public self-service reset flow in
 * app/api/auth/confirm-password-reset (the member picks the password, after
 * proving it's really them via a one-time emailed token — see
 * lib/passwordResetTokens.ts for why that flow exists instead of Wix's own
 * "forgot password" email, which 404s for this project).
 */
export async function setMemberPassword(email: string, newPassword: string): Promise<void> {
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    throw new Error("Admin Wix credentials are not configured (WIX_API_KEY).");
  }

  const client = createWixClient();
  const tokens = await client.auth.getMemberTokensForExternalLoginWithSession(email, apiKey);

  const memberClient = createWixClient(tokens);
  const res = await memberClient.fetchWithAuth(
    "https://www.wixapis.com/_api/iam/authentication/v2/change-password",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Wix rejected the new password (${res.status}). ${text}`.trim());
  }
}

/** Admin-tool variant: generates the password itself and returns it, for
 *  display once in the admin dashboard. */
export async function adminResetMemberPassword(email: string): Promise<string> {
  const newPassword = generateTempPassword();
  await setMemberPassword(email, newPassword);
  return newPassword;
}
