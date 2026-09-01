import Cookies from "js-cookie";
import type { Tokens } from "@wix/sdk";
import type { WixClient } from "./wixClient";

/**
 * Thin wrapper around Wix's Custom Login authentication API
 * (client.auth.register/login/processVerification) — see
 * https://dev.wix.com/docs/go-headless/develop-your-project/authentication/members/custom-login-page/custom-login-using-the-js-sdk
 *
 * Wix owns the password entirely (hashing, storage, its own native
 * "verify your email" code flow) — this module never sees or stores a
 * password itself, it only relays the SDK's state machine into something a
 * form component can branch on.
 */

export type AuthOutcome =
  | { status: "success" }
  | { status: "verify"; pendingState: unknown; email: string }
  | { status: "captcha"; message: string }
  | { status: "error"; message: string; errorCode?: string };

const FAILURE_MESSAGES: Record<string, string> = {
  emailAlreadyExists: "You've already got an account with this email — sign in instead.",
  invalidPassword:
    "That password doesn't meet the requirements — try at least 8 characters with a mix of letters and numbers.",
  invalidEmail: "That doesn't look like a valid email address.",
  resetPassword: "This account needs a password reset before you can sign in — use \"Forgot password\" below.",
  missingCaptchaToken: "We couldn't verify you're not a robot — please try again.",
  invalidCaptchaToken: "We couldn't verify you're not a robot — please try again.",
};

/** Persists Wix member tokens the same way login-callback.tsx does for the
 *  OAuth-redirect path — one shared cookie both paths write to, so the rest
 *  of the app (WixProvider, every client-side Wix data call in the portal)
 *  doesn't need to know which path a given session came from. `secure` is
 *  added here (the original OAuth path didn't set it) since this cookie
 *  necessarily has to stay JS-readable — the client SDK reads it directly
 *  to authenticate every browser-side Wix call the portal makes — so it
 *  can't be made httpOnly without rerouting all of those through server
 *  routes instead, which is a much larger change than this pass. */
function persistSession(tokens: Tokens) {
  Cookies.set("session", JSON.stringify(tokens), { path: "/", sameSite: "lax", secure: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveState(client: WixClient, state: any): Promise<AuthOutcome> {
  switch (state.loginState) {
    case "SUCCESS": {
      const tokens = await client.auth.getMemberTokensForDirectLogin(state.data.sessionToken);
      persistSession(tokens);
      return { status: "success" };
    }
    case "EMAIL_VERIFICATION_REQUIRED":
      return { status: "verify", pendingState: state, email: "" };
    case "SILENT_CAPTCHA_REQUIRED":
    case "USER_CAPTCHA_REQUIRED":
      return {
        status: "captcha",
        message:
          "We need to double-check you're not a robot — please try again in a moment, or contact us if this keeps happening.",
      };
    case "FAILURE":
      return {
        status: "error",
        message: (state.errorCode && FAILURE_MESSAGES[state.errorCode]) || state.error || "Something went wrong. Please try again.",
        errorCode: state.errorCode,
      };
    default:
      return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function registerMember(
  client: WixClient,
  email: string,
  password: string,
  nickname: string
): Promise<AuthOutcome> {
  const state = await client.auth.register({ email, password, profile: { nickname } });
  const outcome = await resolveState(client, state);
  return outcome.status === "verify" ? { ...outcome, email } : outcome;
}

export async function loginMember(client: WixClient, email: string, password: string): Promise<AuthOutcome> {
  const state = await client.auth.login({ email, password });
  const outcome = await resolveState(client, state);
  return outcome.status === "verify" ? { ...outcome, email } : outcome;
}

export async function submitVerificationCode(
  client: WixClient,
  verificationCode: string,
  pendingState: unknown
): Promise<AuthOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = await client.auth.processVerification({ verificationCode }, pendingState as any);
  return resolveState(client, state);
}

export async function requestPasswordReset(client: WixClient, email: string): Promise<void> {
  await client.auth.sendPasswordResetEmail(email, `${window.location.origin}/login-callback`);
}
