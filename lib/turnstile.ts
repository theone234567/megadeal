import "server-only";
import { SITE_URL } from "./siteConfig";

/**
 * Cloudflare Turnstile, the robot check on business sign-up, sign-in and
 * password reset once logins move off Wix (Wix's own reCAPTCHA only works
 * with Wix), and on the public deal-alert and contact forms: each of those
 * sends an email, and a bot sending thousands could use up the day's
 * email allowance that sign-up codes and password resets need. Checked on
 * the server with TURNSTILE_SECRET_KEY; the page
 * shows the widget with NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 *
 * Fails closed: with no secret configured every check fails, unless
 * TURNSTILE_DISABLED=1 is set on purpose (local development only).
 */
/**
 * Whether the public forms (deal-alert sign-up, contact) ask for the check.
 * Only once both keys are in place: the site key is built into the page,
 * the secret checks it here. Until then they rely on their rate limits, so
 * adding one key without the other can't stop anyone signing up.
 */
export function publicFormCheckOn(): boolean {
  if (process.env.TURNSTILE_DISABLED === "1" && process.env.NODE_ENV !== "production") return false;
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  if (process.env.TURNSTILE_DISABLED === "1" && process.env.NODE_ENV !== "production") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY isn't set; refusing");
    return false;
  }
  if (typeof token !== "string" || !token || token.length > 2048) {
    console.error("[turnstile] no token from the page");
    return false;
  }
  // Not sending the visitor's address (Cloudflare's optional remoteip): a
  // home connection with both IPv4 and IPv6 can solve the check on one and
  // send the form on the other, and Cloudflare may then refuse a solved
  // check (suspected when the sign-up form failed live, 9 Oct 2026). The
  // token is single-use, expires in five minutes and must come from our
  // own hostname, checked below.
  void ip;
  const form = new URLSearchParams({ secret, response: token });
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(8000) });
    const out = (await res.json().catch(() => ({}))) as { success?: boolean; hostname?: string; "error-codes"?: string[] };
    if (!out.success) {
      console.error("[turnstile] refused", JSON.stringify(out["error-codes"] ?? []));
      return false;
    }
    // A token solved on another site isn't ours. (Cloudflare's test keys
    // answer "example.com", accepted only away from production.)
    const host = new URL(SITE_URL).hostname;
    const ours = out.hostname === host || (process.env.NODE_ENV !== "production" && out.hostname === "example.com");
    if (!ours) console.error("[turnstile] solved on another hostname", out.hostname);
    return ours;
  } catch (err) {
    console.error("[turnstile] verification unreachable", err);
    return false;
  }
}
