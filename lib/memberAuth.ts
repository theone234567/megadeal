import type { NextRequest } from "next/server";
import { createWixClient } from "./wixClient";

export interface VerifiedMember {
  id: string;
  email: string | null;
  /** Wix's own verified-email flag on the member — the real signal, not a
   *  custom token we invented ourselves. */
  loginEmailVerified: boolean;
}

/**
 * Re-derives the calling site member from their own "session" cookie
 * (the same tokens the browser client uses) by asking Wix who they are —
 * never trust a member identity supplied directly in a request body, since
 * that would let anyone claim to be any merchant.
 */
export async function getVerifiedMember(req: NextRequest): Promise<VerifiedMember | null> {
  const raw = req.cookies.get("session")?.value;
  if (!raw) return null;

  let tokens;
  try {
    tokens = JSON.parse(raw);
  } catch {
    return null;
  }

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
    };
  } catch {
    return null;
  }
}
