import type { NextRequest } from "next/server";
import { createWixClient } from "./wixClient";
import { MEMBER_COOKIE_NAME, parseTokens } from "./memberSession";

export interface VerifiedMember {
  id: string;
  email: string | null;
  /** Wix's own verified-email flag on the member — the real signal, not a
   *  custom token we invented ourselves. */
  loginEmailVerified: boolean;
  /** Display name for the header. Nothing trusts this. */
  nickname: string | null;
}

/**
 * Re-derives the calling site member from their httpOnly session cookie by
 * asking Wix who they are — never trust a member identity supplied directly
 * in a request body, since that would let anyone claim to be any merchant.
 *
 * Reads MEMBER_COOKIE_NAME, not the old shared "session" cookie. That one
 * is still seeded with visitor tokens for the browser SDK and is readable
 * by script; member tokens no longer go anywhere near it. A merchant
 * signed in before that split has no member cookie and is simply signed
 * out — a one-time re-login, which is the right trade for not leaving
 * stealable tokens in place.
 */
export async function getVerifiedMember(req: NextRequest): Promise<VerifiedMember | null> {
  const tokens = parseTokens(req.cookies.get(MEMBER_COOKIE_NAME)?.value);
  if (!tokens) return null;

  try {
    const client = createWixClient(tokens);
    if (!client.auth.loggedIn()) return null;
    // FULL is required, not a nicety. loginEmail and loginEmailVerified
    // are not in the default (PUBLIC) fieldset, so without this both come
    // back undefined — and every caller here treats that as fact: the
    // apply route stored email: "" and emailVerified: false onto real,
    // verified merchants, which is what put "No email on file" and
    // "Email pending verification" on accounts that had just verified.
    const { member } = await client.members.getCurrentMember({ fieldsets: ["FULL"] });
    if (!member?._id) return null;
    return {
      id: member._id,
      email: member.loginEmail ?? null,
      loginEmailVerified: Boolean(member.loginEmailVerified),
      nickname: member.profile?.nickname ?? null,
    };
  } catch {
    return null;
  }
}
