import type { Tokens } from "@wix/sdk";
import type { WixClient } from "./wixClient";

/**
 * Everything in this module talks to `client.auth` and nothing else, so it
 * accepts anything carrying one rather than a fully-moduled client. That
 * is what lets the browser use the stripped-down client from
 * lib/wixBrowserClient.ts — which has no modules at all — while the server
 * keeps passing its member-capable one. Typing it as the full WixClient
 * would silently require @wix/members in the page bundle for no reason.
 */
type AuthClient = Pick<WixClient, "auth">;

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
  /** Wix asked for a CAPTCHA. `kind` says which: "user" means it judged
   *  this attempt suspicious and wants a human to tick a box; "silent"
   *  means a background check. Carrying the kind is what lets a form show
   *  the checkbox only when Wix actually wants one. */
  | { status: "captcha"; kind: "silent" | "user"; message: string }
  | { status: "error"; message: string; errorCode?: string };

// Wix returns the same "invalidPassword" errorCode whether the problem is
// a signup password that's too weak, or a login attempt with the wrong
// password for an existing account — two completely different problems
// with completely different fixes. resolveState below picks the right one
// for the call it came from; this is the signup-flow copy.
const REGISTER_INVALID_PASSWORD_MESSAGE =
  "That password doesn't meet the requirements — try at least 8 characters with a mix of letters and numbers.";
const LOGIN_INVALID_PASSWORD_MESSAGE =
  'That password isn\'t right for this account. Try again, or use "Forgot password" below.';

const FAILURE_MESSAGES: Record<string, string> = {
  emailAlreadyExists: "You've already got an account with this email — sign in instead.",
  invalidPassword: REGISTER_INVALID_PASSWORD_MESSAGE,
  invalidEmail: "That doesn't look like a valid email address.",
  resetPassword: "This account needs a password reset before you can sign in — use \"Forgot password\" below.",
  // These two are opposite failures and used to share one message, which
  // made a live outage undiagnosable: "couldn't verify you're not a robot"
  // was shown both when the browser never produced a captcha token and
  // when it produced one Wix refused. They now read differently, so the
  // message itself says which half of the handshake broke.
  //
  // missingCaptchaToken: we sent no token at all. lib/recaptcha.ts resolves
  // to null on every failure path, so this means reCAPTCHA never loaded,
  // never ran, or was dismissed — not that the visitor failed a challenge.
  missingCaptchaToken:
    "We couldn't load the security check on this page. It's usually an ad-blocker or a strict privacy setting — try again, or try a different browser. [captcha-missing]",
  // invalidCaptchaToken: we DID send a token and it was rejected. That
  // points at the token itself (expired, replayed, or issued for a site
  // key that isn't valid on this domain) rather than at page load.
  invalidCaptchaToken:
    "The security check didn't pass. Please try again. [captcha-rejected]",
};

/** Hands the freshly-minted member tokens to the server, which stores them
 *  in an httpOnly cookie this code can never read back.
 *
 *  This used to write them into a JS-readable cookie, which meant any XSS
 *  anywhere on the site could lift a refresh token out of document.cookie
 *  and keep the account indefinitely. The tokens still pass through the
 *  browser — the Wix SDK's Custom Login runs here and there is no
 *  server-side equivalent — but they are no longer left anywhere script
 *  can find them afterwards.
 *
 *  Throws if the server refuses them, so a login that cannot be persisted
 *  surfaces as a failure rather than a page that looks signed in until the
 *  next request quietly 401s. */
async function persistSession(tokens: Tokens) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokens }),
  });
  if (!res.ok) {
    throw new Error("Signed in, but we couldn't start your session. Please try again.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveState(
  client: AuthClient,
  state: any,
  // Verification-code submission (the only caller that omits this) can't
  // itself produce an invalidPassword failure, so which default it gets
  // doesn't change any real outcome.
  flow: "login" | "register" = "login"
): Promise<AuthOutcome> {
  switch (state.loginState) {
    case "SUCCESS": {
      const tokens = await client.auth.getMemberTokensForDirectLogin(state.data.sessionToken);
      await persistSession(tokens);
      return { status: "success" };
    }
    case "EMAIL_VERIFICATION_REQUIRED":
      return { status: "verify", pendingState: state, email: "" };
    // Wix's own "this needs a CAPTCHA" states. Both used to collapse into
    // one dead-end message telling the visitor to try again later, which
    // no amount of retrying could clear — so a visitor Wix found
    // suspicious could never create an account or reach their portal at
    // all. They are now distinguishable, and the forms answer them by
    // showing the checkbox, which is the only thing that resolves either.
    case "SILENT_CAPTCHA_REQUIRED":
      return {
        status: "captcha",
        kind: "silent",
        message: "We need to run a quick security check.",
      };
    case "USER_CAPTCHA_REQUIRED":
      return {
        status: "captcha",
        kind: "user",
        message: "We need to check you're not a robot.",
      };
    case "FAILURE": {
      const message =
        state.errorCode === "invalidPassword" && flow === "login"
          ? LOGIN_INVALID_PASSWORD_MESSAGE
          : (state.errorCode && FAILURE_MESSAGES[state.errorCode]) ||
            state.error ||
            "Something went wrong. Please try again.";
      return { status: "error", message, errorCode: state.errorCode };
    }
    default:
      return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function registerMember(
  client: AuthClient,
  email: string,
  password: string,
  nickname: string,
  /** reCAPTCHA token(s). Either variant may be supplied.
   *
   *  Wix's guide shows the VISIBLE token (`recaptchaToken`) on register
   *  and the INVISIBLE one (`invisibleRecaptchaToken`) on login, and they
   *  travel in separate fields — so passing the wrong one reads to Wix as
   *  no token at all and returns 403 "missingCaptchaToken", which is
   *  indistinguishable from sending nothing. That cost an outage once.
   *
   *  But the SDK does not enforce the split: RegisterParams extends
   *  LoginParams, so register accepts both fields exactly as login does.
   *  Whether Wix's backend accepts an invisible token here is not stated
   *  anywhere we can check, so the form tries invisible first — no
   *  checkbox, no friction — and only falls back to the visible widget if
   *  Wix actually rejects it. This signature takes whichever it has.
   *
   *  Docs: https://dev.wix.com/docs/go-headless/authentication/members/custom-login-page/re-captcha/about-re-captcha
   */
  captchaTokens?: { recaptchaToken?: string | null; invisibleRecaptchaToken?: string | null }
): Promise<AuthOutcome> {
  const tokens = {
    ...(captchaTokens?.recaptchaToken ? { recaptchaToken: captchaTokens.recaptchaToken } : {}),
    ...(captchaTokens?.invisibleRecaptchaToken
      ? { invisibleRecaptchaToken: captchaTokens.invisibleRecaptchaToken }
      : {}),
  };

  const state = await client.auth.register({
    email,
    password,
    profile: { nickname },
    ...(Object.keys(tokens).length ? { captchaTokens: tokens } : {}),
  });
  const outcome = await resolveState(client, state, "register");
  return outcome.status === "verify" ? { ...outcome, email } : outcome;
}

export async function loginMember(
  client: AuthClient,
  email: string,
  password: string,
  /** reCAPTCHA token(s). Same CAPTCHA requirement as registration — Wix
   *  applies it to loginV2 too, so without this an existing merchant can
   *  be locked out of their own portal.
   *
   *  Takes the same shape as registerMember rather than a bare positional
   *  token, so the caller states which variant it is sending. Login
   *  normally sends the invisible one; if Wix rejects that, the form falls
   *  back to the visible checkbox and sends `recaptchaToken` instead. The
   *  two travel in different fields, so a visible token passed as the
   *  invisible one reads to Wix as no token at all — that exact mix-up is
   *  what made business signup impossible for hours. */
  captchaTokens?: { recaptchaToken?: string | null; invisibleRecaptchaToken?: string | null }
): Promise<AuthOutcome> {
  const tokens = {
    ...(captchaTokens?.recaptchaToken ? { recaptchaToken: captchaTokens.recaptchaToken } : {}),
    ...(captchaTokens?.invisibleRecaptchaToken
      ? { invisibleRecaptchaToken: captchaTokens.invisibleRecaptchaToken }
      : {}),
  };

  const state = await client.auth.login({
    email,
    password,
    ...(Object.keys(tokens).length ? { captchaTokens: tokens } : {}),
  });
  const outcome = await resolveState(client, state, "login");
  return outcome.status === "verify" ? { ...outcome, email } : outcome;
}

export async function submitVerificationCode(
  client: AuthClient,
  verificationCode: string,
  pendingState: unknown
): Promise<AuthOutcome> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = await client.auth.processVerification({ verificationCode }, pendingState as any);
  return resolveState(client, state);
}
