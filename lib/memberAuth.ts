import type { NextRequest } from "next/server";
import { getSupabaseMember } from "./authSession";

export interface VerifiedMember {
  id: string;
  email: string | null;
  /** Whether the account confirmed its email with the emailed code. */
  loginEmailVerified: boolean;
  /** Display name for the header. Nothing trusts this. */
  nickname: string | null;
}

/**
 * The signed-in business account, from its httpOnly session cookies
 * (lib/authSession.ts) — never from a member identity supplied in a
 * request body, since that would let anyone claim to be any merchant.
 */
export async function getVerifiedMember(req: NextRequest): Promise<VerifiedMember | null> {
  return getSupabaseMember(req);
}
