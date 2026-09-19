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
 * Forces a brand-new password for an existing member, entirely server-side —
 * no email, no Wix-hosted page. Stopgap for "Forgot password" on
 * /list-your-business, which currently 404s: that flow emails a link to a
 * password-reset page Wix itself is supposed to host, and this headless
 * project's connected Wix site has nothing published there to show.
 *
 * Mechanism: an admin-authorized Sign On (proves control of the account via
 * WIX_API_KEY, not the member's password) mints a session for the member,
 * which is then exchanged for real member tokens and used to call Change
 * Password exactly as the member would from a "change password" screen —
 * the same two-step flow getMemberTokensForExternalLoginWithSession wraps.
 */
export async function adminResetMemberPassword(email: string): Promise<string> {
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    throw new Error("Admin Wix credentials are not configured (WIX_API_KEY).");
  }

  const client = createWixClient();
  const tokens = await client.auth.getMemberTokensForExternalLoginWithSession(email, apiKey);

  const newPassword = generateTempPassword();
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

  return newPassword;
}
