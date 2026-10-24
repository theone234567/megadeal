/**
 * How the admin dashboard is signed in to (security pack T152).
 *
 * - "password-and-code": ADMIN_TOTP_SECRET is set, so the password and a
 *   code from the authenticator app are both needed.
 * - "setup-needed": ADMIN_REQUIRE_TOTP=true but no ADMIN_TOTP_SECRET yet.
 *   Admin sign-in is refused until two-factor sign-in is set up
 *   (app/admin/two-factor, which works signed out in this state only).
 * - "password": no secret and not required: the password alone.
 *
 * Requiring it is the owner's switch (ADMIN_REQUIRE_TOTP=true in
 * Cloudflare), not the default on the live site yet: the owner hasn't set
 * up the authenticator (24 Oct), and failing closed then would lock them
 * out of admin. Once ADMIN_TOTP_SECRET is set, the code is always needed.
 */
export type AdminSignInMode = "password" | "password-and-code" | "setup-needed";

export function adminSignInMode(): AdminSignInMode {
  if (process.env.ADMIN_TOTP_SECRET?.trim()) return "password-and-code";
  return process.env.ADMIN_REQUIRE_TOTP === "true" ? "setup-needed" : "password";
}

/** Failed admin sign-ins from every address together, per hour, before
 *  sign-in pauses for everyone (the per-address limit is 3 per 15 min). */
export const ADMIN_GLOBAL_MAX_FAILURES = 30;
export const ADMIN_GLOBAL_WINDOW_SECONDS = 60 * 60;
export const ADMIN_GLOBAL_LOCK_SECONDS = 15 * 60;
/** The global count's key in the per-address lock tables. */
export const GLOBAL_KEY = "all-addresses";
