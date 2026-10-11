import { NextRequest, NextResponse } from "next/server";
import {
  consumePasswordResetToken,
  restorePasswordResetToken,
  revokePasswordResetTokens,
} from "@/lib/passwordResetTokens";
import { setMemberPassword } from "@/lib/wixPassword";
import { accountIdForEmail, authBackend } from "@/lib/authSession";
import { endAllSessions } from "@/lib/authSession";
import { adminSetPassword } from "@/lib/supabaseAuth";
import { BREACHED_PASSWORD_MESSAGE, passwordSeenInBreaches } from "@/lib/pwnedPassword";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/readJsonBody";
import { RESET_COOKIE, RESET_TOKEN_RE } from "@/lib/sensitivePaths";

// Wix's rule; MegaDeal's own logins ask for 10 (lib/authRoutes.ts).
const minPasswordLength = () => (authBackend() === "supabase" ? 10 : 8);

const LINK_USED =
  "This link has expired or has already been used. Get a new one with “Forgot password” on the sign-in page.";

/** A JSON answer that's never cached, optionally clearing the reset cookie. */
function reply(body: Record<string, unknown>, status: number, clearLink = false) {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (clearLink) res.cookies.delete(RESET_COOKIE);
  return res;
}

/**
 * The other half of the self-service reset flow: the page at
 * /reset-password posts the password the visitor chose. The link's token
 * comes in the HttpOnly cookie middleware.ts set when the emailed link was
 * opened (or, from older pages and tests, in the body).
 *
 * Cheapest checks first (security audit of 10 Oct 2026, finding 6): a
 * per-visitor limit, a capped body, the token's shape, the password's
 * length; only then the breached-password lookup and the token itself.
 */
export async function POST(req: NextRequest) {
  if ((await checkRateLimit(`pwreset-confirm-ip:${getClientIp(req)}`, 20, 15 * 60, { failClosed: true })).limited) {
    return reply({ error: "Too many attempts. Please wait a few minutes and try again." }, 429);
  }
  const body = await readJsonBody(req, 4096);
  if (body === "too_large") return reply({ error: "That request was too large." }, 413);
  const fields = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fromBody = typeof fields.token === "string" ? fields.token.trim() : "";
  const token = req.cookies.get(RESET_COOKIE)?.value || fromBody;
  const newPassword = typeof fields.newPassword === "string" ? fields.newPassword : "";

  if (!RESET_TOKEN_RE.test(token)) {
    return reply({ error: "This reset link is invalid. Open the link in your email again." }, 400, true);
  }
  if (newPassword.length < minPasswordLength() || newPassword.length > 200) {
    return reply({ error: `Password must be at least ${minPasswordLength()} characters.` }, 400);
  }

  // Before the link is used up, so choosing another password still works.
  if (await passwordSeenInBreaches(newPassword)) {
    return reply({ error: BREACHED_PASSWORD_MESSAGE }, 400);
  }

  // Used up in one step before anything else: two submissions at once
  // can't both get through. If setting the password then fails for a
  // reason that isn't the link's, it's put back so the same link works
  // for another try.
  const used = await consumePasswordResetToken(token);
  if (!used) return reply({ error: LINK_USED }, 400, true);
  const email = used.email;

  try {
    if (authBackend() === "supabase") {
      // The link proved the address: set the password (making the login
      // for a business brought over from Wix), then end every session
      // that used the old one.
      const userId = await accountIdForEmail(email);
      const set = await adminSetPassword(email, newPassword, userId);
      if (!set.ok) {
        console.error("[auth/confirm-password-reset] refused", set.status, set.code);
        await restorePasswordResetToken(token, used);
        const weak = set.code === "weak_password";
        return reply(
          { error: weak ? "Choose a stronger password: longer, and not a common one." : "Couldn't set your new password. Please try again." },
          weak ? 400 : 502
        );
      }
      await endAllSessions(set.data.id ?? userId);
    } else {
      await setMemberPassword(email, newPassword);
    }
  } catch (err) {
    // Never the provider's own text: it can say more than a visitor should
    // see (security review finding 2).
    console.error("[auth/confirm-password-reset] failed", err);
    await restorePasswordResetToken(token, used).catch(() => {});
    return reply({ error: "Couldn't set your new password. Please try again." }, 500);
  }

  // Every other link still out for this address stops working too.
  await revokePasswordResetTokens(email).catch((err) => console.error("[auth/confirm-password-reset] revoke failed", err));
  return reply({ ok: true }, 200, true);
}
