import { NextRequest, NextResponse } from "next/server";
import { createWixClient } from "@/lib/wixClient";
import {
  MEMBER_COOKIE_NAME,
  MEMBER_COOKIE_OPTIONS,
  serializeTokens,
} from "@/lib/memberSession";

export const dynamic = "force-dynamic";

/**
 * Exchanges Wix member tokens for an httpOnly session cookie.
 *
 * The browser still ends up holding the tokens for a moment — it is the
 * Wix SDK in the page that performs the login and receives them, and
 * there is no server-side equivalent of Custom Login's state machine to
 * move that off the client. What changed is that they are no longer
 * *stored* anywhere a script can reach: they go straight into a cookie
 * script cannot read, and the copy in JS memory dies with the page.
 *
 * The tokens are verified against Wix before anything is written, so a
 * malformed or expired blob becomes a 401 here rather than a cookie that
 * fails confusingly on the next request.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tokens = body?.tokens;
  if (!tokens || typeof tokens !== "object") {
    return NextResponse.json({ error: "Missing tokens." }, { status: 400 });
  }

  try {
    const client = createWixClient(tokens);
    if (!client.auth.loggedIn()) {
      return NextResponse.json({ error: "Not a signed-in member." }, { status: 401 });
    }
    const { member } = await client.members.getCurrentMember({ fieldsets: ["FULL"] });
    if (!member?._id) {
      return NextResponse.json({ error: "Not a signed-in member." }, { status: 401 });
    }

    const res = NextResponse.json({
      member: {
        id: member._id,
        email: member.loginEmail ?? null,
        loginEmailVerified: Boolean(member.loginEmailVerified),
        nickname: member.profile?.nickname ?? null,
      },
    });
    res.cookies.set(MEMBER_COOKIE_NAME, serializeTokens(tokens), MEMBER_COOKIE_OPTIONS);
    return res;
  } catch (err) {
    console.error("[auth/session] failed to establish session", err);
    return NextResponse.json({ error: "Couldn't complete sign in." }, { status: 401 });
  }
}
