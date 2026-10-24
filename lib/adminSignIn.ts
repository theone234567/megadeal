/**
 * How the admin dashboard is signed in to (security pack T152).
 *
 * - "password-and-code": ADMIN_TOTP_SECRET is set, so the password and a
 *   code from the authenticator app are both needed.
 * - "setup-needed": the live site without ADMIN_TOTP_SECRET. Admin sign-in
 *   is refused until two-factor sign-in is set up (app/admin/two-factor,
 *   which works signed out in this state only). It used to fall back to
 *   the password alone.
 * - "password": local development (next dev) without a secret.
 *   ADMIN_REQUIRE_TOTP=true makes development behave like the live site.
 */
export type AdminSignInMode = "password" | "password-and-code" | "setup-needed";

export function adminSignInMode(): AdminSignInMode {
  if (process.env.ADMIN_TOTP_SECRET?.trim()) return "password-and-code";
  const required = process.env.NODE_ENV === "production" || process.env.ADMIN_REQUIRE_TOTP === "true";
  return required ? "setup-needed" : "password";
}

/** Failed admin sign-ins from every address together, per hour, before
 *  sign-in pauses for everyone (the per-address limit is 3 per 15 min). */
export const ADMIN_GLOBAL_MAX_FAILURES = 30;
export const ADMIN_GLOBAL_WINDOW_SECONDS = 60 * 60;
export const ADMIN_GLOBAL_LOCK_SECONDS = 15 * 60;
/** The global count's key in the per-address lock tables. */
export const GLOBAL_KEY = "all-addresses";
