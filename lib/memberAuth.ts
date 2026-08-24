import type { NextRequest } from "next/server";
import { createWixClient } from "./wixClient";

export interface VerifiedMember {
  id: string;
  email: string | null;
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
    const { member } = await client.members.getCurrentMember();
    if (!member?._id) return null;
    return { id: member._id, email: member.loginEmail ?? null };
  } catch {
    return null;
  }
}
