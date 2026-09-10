import { randomBytes } from "crypto";
import { createWixAdminClient } from "./wixAdmin";

/**
 * Deal-alert / waitlist signups, stored in Wix Data's "EmailSignups"
 * collection — the same collection the admin dashboard
 * (/api/admin/email-signups, its CSV export) and the public trust counter
 * (lib/publicStats.ts's getSignupStats) already read from. Genuine Wix
 * infrastructure throughout: the same adminClient.items pattern used for
 * every other collection in this app (Merchants, Deals, ContactMessages),
 * no third-party vendor involved.
 *
 * Tokens are random (not signed/HMAC) and looked up by exact match, same
 * as everywhere else a "prove you got this email" link is needed in this
 * app — verifyToken is single-use (cleared once confirmed, so a leaked or
 * logged confirm link can't be replayed), unsubscribeToken is permanent
 * (an old email's unsubscribe link has to keep working indefinitely).
 */

export type EmailAudience = "customer" | "merchant";

export async function insertEmailSignup({
  email,
  audience,
  source,
  verified,
}: {
  email: string;
  audience: EmailAudience;
  source: string;
  // true for flows where the email is already known-good (e.g. a merchant
  // signing up through their own verified Wix member account) — skips
  // generating/needing a verifyToken since there's nothing to confirm.
  verified: boolean;
}): Promise<{ verifyToken: string; unsubscribeToken: string } | null> {
  try {
    const adminClient = createWixAdminClient();
    const verifyToken = verified ? "" : randomBytes(32).toString("hex");
    const unsubscribeToken = randomBytes(32).toString("hex");
    await adminClient.items.insert("EmailSignups", {
      email,
      audience,
      source,
      verified,
      verifyToken,
      unsubscribed: false,
      unsubscribeToken,
    });
    return { verifyToken, unsubscribeToken };
  } catch (err) {
    console.error("[emailSignups] insertEmailSignup failed", err);
    return null;
  }
}

export async function verifyEmailSignupByToken(token: string): Promise<boolean> {
  try {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items.query("EmailSignups").eq("verifyToken", token).find();
    const signup = result.items?.[0];
    if (!signup) return false;
    await adminClient.items.update("EmailSignups", { ...signup, verified: true, verifyToken: "" });
    return true;
  } catch (err) {
    console.error("[emailSignups] verifyEmailSignupByToken failed", err);
    return false;
  }
}

export async function unsubscribeEmailSignupByToken(token: string): Promise<boolean> {
  try {
    const adminClient = createWixAdminClient();
    const result = await adminClient.items
      .query("EmailSignups")
      .eq("unsubscribeToken", token)
      .find();
    const signup = result.items?.[0];
    if (!signup) return false;
    if (!signup.unsubscribed) {
      await adminClient.items.update("EmailSignups", { ...signup, unsubscribed: true });
    }
    return true;
  } catch (err) {
    console.error("[emailSignups] unsubscribeEmailSignupByToken failed", err);
    return false;
  }
}
