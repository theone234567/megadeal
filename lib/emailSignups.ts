import { randomBytes } from "crypto";
import { createWixAdminClient } from "./wixAdmin";
import { queryAllByEmail } from "./queryAll";

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

export interface EmailSignupResult {
  verifyToken: string;
  unsubscribeToken: string;
  /** The address is already confirmed and subscribed — nothing to send. */
  alreadySubscribed: boolean;
}

/**
 * Adds an address to the list, or brings the row it already has back to
 * life — never a second row for the same address and audience.
 *
 * This used to insert unconditionally. Signing up twice therefore made two
 * rows, and nothing anywhere collapsed them, so:
 *
 *  - the public waitlist figure on /list-your-business counted the same
 *    person once per signup, inflating a number presented to businesses
 *    as real subscribers;
 *  - unsubscribing only ever flipped the one row whose token was in the
 *    link that was clicked, leaving the duplicates subscribed — so the
 *    emails kept coming after someone opted out, which is the one outcome
 *    a mailing list must never produce;
 *  - the CSV export handed over the same address several times.
 *
 * Matching is on the stored address, under both casings, for the same
 * reason as everywhere else: Wix Data's eq() is case-sensitive, and the
 * anonymous flow lower-cases while the merchant flow stores whatever Wix
 * gives it.
 *
 * A read followed by a write is not a unique constraint — two requests for
 * the same address arriving together can still both find nothing and both
 * insert. Wix Data has no unique index to lean on here, and the rate
 * limiter in /api/email-signup already caps an address at 3 attempts a
 * day, so the remaining window is one simultaneous double-submit. That is
 * worth narrowing from "every repeat signup" to "a genuine race".
 */
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
}): Promise<EmailSignupResult | null> {
  try {
    const adminClient = createWixAdminClient();

    const existing = (
      await queryAllByEmail(
        (e) => adminClient.items.query("EmailSignups").eq("email", e),
        email,
        "EmailSignups (dedupe)"
      )
    ).find((row: any) => row.audience === audience);

    if (existing) {
      // Already confirmed and still subscribed: leave it completely alone.
      // Re-issuing a verifyToken here would let anyone drop a real
      // subscriber back to unverified just by submitting their address.
      if (existing.verified && !existing.unsubscribed) {
        return {
          verifyToken: "",
          unsubscribeToken: existing.unsubscribeToken || "",
          alreadySubscribed: true,
        };
      }

      // Unconfirmed, or previously unsubscribed and coming back. Issue a
      // fresh confirmation and let the click decide — resubscribing is the
      // inbox owner's call, not the submitter's, so `unsubscribed` stays
      // as it is until they act on the email (see verifyEmailSignupByToken).
      const verifyToken = verified ? "" : randomBytes(32).toString("hex");
      const unsubscribeToken = existing.unsubscribeToken || randomBytes(32).toString("hex");
      await adminClient.items.update("EmailSignups", {
        ...existing,
        source,
        verifyToken,
        unsubscribeToken,
        // A trusted flow (a signed-in, verified member) confirms on the
        // spot, including undoing an earlier unsubscribe, because the
        // person is demonstrably the account holder.
        verified: verified || existing.verified,
        unsubscribed: verified ? false : existing.unsubscribed,
      });
      return { verifyToken, unsubscribeToken, alreadySubscribed: false };
    }

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
    return { verifyToken, unsubscribeToken, alreadySubscribed: false };
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
    // unsubscribed is cleared too: this link only reaches the inbox that
    // owns the address, so clicking it is that person opting back in. A row
    // left verified-but-unsubscribed would otherwise show "you're on the
    // list" while silently sending nothing.
    await adminClient.items.update("EmailSignups", {
      ...signup,
      verified: true,
      verifyToken: "",
      unsubscribed: false,
    });
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

    // Every row for this address, not just the one whose token was in the
    // link. Signups were inserted without a dedupe check until recently, so
    // real duplicates exist in the collection — and unsubscribing one of
    // them while the others kept their place on the list meant the emails
    // carried on arriving after someone had opted out. One opt-out has to
    // mean opted out, including for rows created before this was fixed.
    const rows = signup.email
      ? await queryAllByEmail(
          (e) => adminClient.items.query("EmailSignups").eq("email", e),
          String(signup.email),
          "EmailSignups (unsubscribe)"
        )
      : [signup];

    for (const row of rows.length ? rows : [signup]) {
      if (row.unsubscribed) continue;
      try {
        await adminClient.items.update("EmailSignups", { ...row, unsubscribed: true });
      } catch (err) {
        // Keep going: a failure on one duplicate must not leave the rest
        // subscribed. The click still counts as an opt-out.
        console.error("[emailSignups] unsubscribe failed for one row", err);
      }
    }
    return true;
  } catch (err) {
    console.error("[emailSignups] unsubscribeEmailSignupByToken failed", err);
    return false;
  }
}
