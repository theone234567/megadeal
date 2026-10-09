import { NextRequest, NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/passwordResetTokens";
import { setMemberPassword } from "@/lib/wixPassword";
import { accountIdForEmail, authBackend, endAllSessions } from "@/lib/authSession";
import { adminSetPassword } from "@/lib/supabaseAuth";
import { BREACHED_PASSWORD_MESSAGE, passwordSeenInBreaches } from "@/lib/pwnedPassword";

// Wix's rule; MegaDeal's own logins ask for 10 (lib/authRoutes.ts).
const minPasswordLength = () => (authBackend() === "supabase" ? 10 : 8);

/** The other half of the self-service reset flow: the page at
 *  /reset-password posts here with the token from the emailed link and
 *  the password the visitor chose. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!token) {
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  }
  if (newPassword.length < minPasswordLength() || newPassword.length > 200) {
    return NextResponse.json(
      { error: `Password must be at least ${minPasswordLength()} characters.` },
      { status: 400 }
    );
  }

  // Before the link is used up, so choosing another password still works.
  if (await passwordSeenInBreaches(newPassword)) {
    return NextResponse.json({ error: BREACHED_PASSWORD_MESSAGE }, { status: 400 });
  }

  // Consumed (deleted) up front regardless of what happens next — a token
  // that's been clicked once should never work a second time, including on
  // a retried request after a transient failure below.
  const email = await consumePasswordResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This link has expired or has already been used. Get a new one with \u201cForgot password\u201d on the sign-in page." },
      { status: 400 }
    );
  }

  try {
    if (authBackend() === "supabase") {
      // The link proved the address: set the password (making the login
      // for a business brought over from Wix), then end every session
      // that used the old one.
      const userId = await accountIdForEmail(email);
      const set = await adminSetPassword(email, newPassword, userId);
      if (!set.ok) {
        console.error("[auth/confirm-password-reset] refused", set.status, set.code);
        const weak = set.code === "weak_password";
        return NextResponse.json(
          { error: weak ? "Choose a stronger password: longer, and not a common one." : "Couldn't set your new password. Please try again." },
          { status: weak ? 400 : 502 }
        );
      }
      await endAllSessions(set.data.id ?? userId);
      return NextResponse.json({ ok: true });
    }
    await setMemberPassword(email, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never the provider's own text: it can say more than a visitor should
    // see (security review finding 2).
    console.error("[auth/confirm-password-reset] failed", err);
    return NextResponse.json({ error: "Couldn't set your new password. Please try again." }, { status: 500 });
  }
}
