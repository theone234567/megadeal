import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { authBackend } from "@/lib/authSession";

export const dynamic = "force-dynamic";

/**
 * Who the caller is, derived server-side from the httpOnly session cookie.
 *
 * WixProvider used to answer this in the browser by reading the tokens out
 * of a readable cookie and asking Wix directly. That is the call that made
 * the tokens need to be script-readable in the first place, so it moves
 * here — the page now learns who it is from its own server, and never
 * handles the credential.
 *
 * Returns a deliberately small shape rather than Wix's full member object:
 * the UI needs an id, an email, the verified flag and a display name, and
 * anything beyond that is contact data with no reason to be in a page.
 */
export async function GET(req: NextRequest) {
  // Which logins the forms should use (context/WixProvider.tsx). Given
  // even when who's signed in can't be checked (the database not
  // answering): without it the forms would guess Wix's.
  const backend = authBackend();
  let member: Awaited<ReturnType<typeof getVerifiedMember>> = null;
  try {
    member = await getVerifiedMember(req);
  } catch (err) {
    console.error("[auth/me] couldn't check the session", err);
  }
  if (!member) {
    return NextResponse.json({ member: null, authBackend: backend });
  }
  return NextResponse.json({
    member: {
      id: member.id,
      email: member.email,
      loginEmailVerified: member.loginEmailVerified,
      nickname: member.nickname,
    },
    authBackend: backend,
  });
}
