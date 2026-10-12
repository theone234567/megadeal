import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";

export const dynamic = "force-dynamic";

/**
 * Who the caller is, derived server-side from the httpOnly session cookie
 * (context/SessionProvider.tsx asks), so the page never handles the
 * credential. A deliberately small shape: an id, an email, the verified
 * flag and a display name.
 */
export async function GET(req: NextRequest) {
  let member: Awaited<ReturnType<typeof getVerifiedMember>> = null;
  try {
    member = await getVerifiedMember(req);
  } catch (err) {
    console.error("[auth/me] couldn't check the session", err);
  }
  if (!member) return NextResponse.json({ member: null });
  return NextResponse.json({
    member: {
      id: member.id,
      email: member.email,
      loginEmailVerified: member.loginEmailVerified,
      nickname: member.nickname,
    },
  });
}
