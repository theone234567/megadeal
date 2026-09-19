import { NextRequest, NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/passwordResetTokens";
import { setMemberPassword } from "@/lib/wixPassword";

const MIN_PASSWORD_LENGTH = 8;

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
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  // Consumed (deleted) up front regardless of what happens next — a token
  // that's been clicked once should never work a second time, including on
  // a retried request after a transient failure below.
  const email = await consumePasswordResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link has expired or already been used. Request a new one." },
      { status: 400 }
    );
  }

  try {
    await setMemberPassword(email, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[auth/confirm-password-reset] failed", err);
    return NextResponse.json(
      { error: err?.message || "Couldn't set your new password. Please try again." },
      { status: 500 }
    );
  }
}
