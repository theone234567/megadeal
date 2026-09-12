/**
 * reCAPTCHA Enterprise, for Wix member registration and login.
 *
 * Wix's registerV2/loginV2 reject a request with HTTP 403 and application
 * error -19971 ("missingCaptchaToken") when the project has CAPTCHA
 * protection enabled and no usable token is supplied. The merchant signup
 * form hit exactly that and nobody could create an account.
 *
 * Three details from Wix's own docs drive the shape of this file, and the
 * first version of it got two of them wrong:
 *
 * 1. It must be the ENTERPRISE library — `recaptcha/enterprise.js`, whose
 *    API hangs off `grecaptcha.enterprise`, not the free `recaptcha/api.js`
 *    at `grecaptcha`. Loading the free script produced a token Wix would
 *    never accept.
 *
 * 2. REGISTRATION expects the VISIBLE (checkbox) reCAPTCHA, passed as
 *    `recaptchaToken`. LOGIN expects the INVISIBLE one, passed as
 *    `invisibleRecaptchaToken`. Sending an invisible token to register
 *    leaves Wix's `Recaptcha` field empty, which reads to it as no token
 *    at all — the exact 403 we were seeing.
 *
 * 3. The site key must be WIX'S, read from `client.auth.captchaVisibleSiteKey`
 *    / `captchaInvisibleSiteKey` (both hardcoded constants inside @wix/sdk).
 *    Our own key would be rejected: the token is verified by Wix, not by us.
 *
 * Docs: https://dev.wix.com/docs/go-headless/authentication/members/custom-login-page/re-captcha/about-re-captcha
 *
 * Tokens are single-use and expire after about two minutes, so a widget
 * must be reset after every submission attempt, successful or not.
 */

const SCRIPT_ID = "megadeal-recaptcha-enterprise";
/** Name of the global Google calls once the API is genuinely usable. Must
 *  be on `window` under exactly this name for `?onload=` to find it. */
const READY_CALLBACK = "__megadealRecaptchaReady";
const SCRIPT_SRC =
  `https://www.google.com/recaptcha/enterprise.js?render=explicit&onload=${READY_CALLBACK}`;

/** Deliberately short. Without the script there is nothing to wait for,
 *  and the form falls back to telling the visitor the check couldn't load
 *  rather than hanging on a spinner. */
const LOAD_TIMEOUT_MS = 8_000;

/** How long to wait on an invisible challenge. Generous, because this one
 *  can legitimately put a puzzle in front of a real person. */
const EXECUTE_TIMEOUT_MS = 45_000;

type RenderOptions = {
  sitekey: string;
  size?: "invisible" | "normal" | "compact";
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type GrecaptchaEnterprise = {
  render: (container: HTMLElement, options: RenderOptions) => number;
  execute: (widgetId: number) => void;
  reset: (widgetId: number) => void;
  ready?: (cb: () => void) => void;
};

declare global {
  interface Window {
    grecaptcha?: { enterprise?: GrecaptchaEnterprise };
    [READY_CALLBACK]?: () => void;
  }
}

/** Why the loader gave up, so the UI can say something true rather than
 *  blaming the visitor's ad-blocker for what might be our own bug. */
export type CaptchaLoadFailure =
  /** The script request itself failed — blocked by an extension, or offline. */
  | "blocked"
  /** It loaded but never became usable, or the widget refused to render.
   *  That points at our configuration (site key, domain), not the visitor. */
  | "unsupported"
  /** Nothing arrived before the deadline. Usually a slow or filtered network. */
  | "timeout"
  /** The Wix client hadn't produced a site key yet — our side, not theirs. */
  | "no-key";

export type LoadResult =
  | { api: GrecaptchaEnterprise; failure?: undefined }
  | { api: null; failure: CaptchaLoadFailure };

let scriptPromise: Promise<LoadResult> | null = null;

/**
 * Loads reCAPTCHA Enterprise and resolves only once the API is actually
 * usable.
 *
 * The signal is Google's own `?onload=` callback, which fires when the
 * library has finished initialising — NOT the script element's `load`
 * event. Those are different moments: `enterprise.js` attaches
 * `grecaptcha.enterprise.render` asynchronously, so a synchronous check at
 * `load` can legitimately find nothing. A previous version of this file
 * treated that as failure and resolved null, which meant a perfectly
 * healthy reCAPTCHA was reported to visitors as "blocked by your
 * ad-blocker" and the signup form refused to submit.
 *
 * A slow poll backs the callback up, in case the script was already
 * present from an earlier mount (when `onload` will not fire again).
 */
function loadScript(): Promise<LoadResult> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<LoadResult>((resolve) => {
    if (typeof window === "undefined") {
      return resolve({ api: null, failure: "unsupported" });
    }

    const ready = (): GrecaptchaEnterprise | null => {
      const api = window.grecaptcha?.enterprise;
      return typeof api?.render === "function" ? api : null;
    };

    const already = ready();
    if (already) return resolve({ api: already });

    let settled = false;
    const finish = (result: LoadResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      try {
        delete window[READY_CALLBACK];
      } catch {
        /* non-configurable in some browsers; harmless */
      }
      resolve(result);
    };

    // Google calls this when the library is initialised and usable.
    window[READY_CALLBACK] = () => {
      const api = ready();
      finish(api ? { api } : { api: null, failure: "unsupported" });
    };

    // Covers the case where the script tag already exists (a remount), so
    // `onload` has fired once and will not fire again.
    const poll = setInterval(() => {
      const api = ready();
      if (api) finish({ api });
    }, 250);

    const timer = setTimeout(() => {
      // Distinguish "never arrived" from "arrived but unusable" — the
      // first is a blocked request, the second points at us.
      finish({
        api: null,
        failure: window.grecaptcha ? "unsupported" : "timeout",
      });
    }, LOAD_TIMEOUT_MS);

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener(
        "error",
        () => finish({ api: null, failure: "blocked" }),
        { once: true }
      );
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

/**
 * Starts fetching reCAPTCHA without waiting for it, so the widget is warm
 * by the time someone has finished filling in a form.
 */
export function preloadCaptcha(): void {
  if (typeof window === "undefined") return;
  void loadScript();
}

export type VisibleCaptchaHandle = {
  /** Clears the current token. Call after every submit attempt — a token
   *  is single-use, so a retry with the same one is rejected. */
  reset: () => void;
};

/**
 * Renders the visible "I'm not a robot" checkbox into `container`. This is
 * the one REGISTRATION needs.
 *
 * Resolves with a handle once mounted, or null if reCAPTCHA could not be
 * loaded at all — the caller is expected to tell the visitor rather than
 * silently submit a request Wix is certain to reject.
 */
export async function renderVisibleCaptcha(
  container: HTMLElement,
  siteKey: string,
  handlers: {
    onToken: (token: string) => void;
    /** Fired when a solved checkbox goes stale (~2 minutes). */
    onExpire: () => void;
    onError: () => void;
  }
): Promise<{ handle: VisibleCaptchaHandle | null; failure?: CaptchaLoadFailure }> {
  if (typeof window === "undefined") return { handle: null, failure: "unsupported" };
  if (!siteKey) return { handle: null, failure: "no-key" };

  const { api: grecaptcha, failure } = await loadScript();
  if (!grecaptcha) return { handle: null, failure };

  try {
    const widgetId = grecaptcha.render(container, {
      sitekey: siteKey,
      size: "normal",
      callback: handlers.onToken,
      "expired-callback": handlers.onExpire,
      "error-callback": handlers.onError,
    });

    return {
      handle: {
        reset: () => {
          try {
            grecaptcha.reset(widgetId);
          } catch {
            /* widget already gone — nothing to clear */
          }
        },
      },
    };
  } catch (err) {
    // render() throwing means the library loaded but rejected what we
    // asked of it — almost always the site key or the domain it's allowed
    // on. Worth surfacing as ours rather than the visitor's problem.
    console.error("[recaptcha] render failed", err);
    return { handle: null, failure: "unsupported" };
  }
}

/**
 * Runs the invisible check and resolves with a token, or null if reCAPTCHA
 * could not be loaded, run, or completed. This is the one LOGIN needs.
 */
export async function getInvisibleCaptchaToken(siteKey: string): Promise<string | null> {
  if (!siteKey || typeof window === "undefined") return null;

  const { api: grecaptcha } = await loadScript();
  if (!grecaptcha) return null;

  let container: HTMLElement | null = null;

  try {
    container = document.createElement("div");
    // Kept out of the layout entirely; when a challenge is genuinely
    // needed reCAPTCHA draws it in its own overlay, not in this node.
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);

    return await new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (token: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        container?.remove();
        resolve(token);
      };

      const timer = setTimeout(() => finish(null), EXECUTE_TIMEOUT_MS);

      let widgetId: number;
      try {
        widgetId = grecaptcha.render(container as HTMLElement, {
          sitekey: siteKey,
          size: "invisible",
          callback: (token) => finish(token),
          "expired-callback": () => finish(null),
          "error-callback": () => finish(null),
        });
      } catch {
        return finish(null);
      }

      try {
        grecaptcha.execute(widgetId);
      } catch {
        finish(null);
      }
    });
  } catch {
    container?.remove();
    return null;
  }
}
