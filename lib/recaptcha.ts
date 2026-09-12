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
const SCRIPT_SRC = "https://www.google.com/recaptcha/enterprise.js?render=explicit";

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
  }
}

let scriptPromise: Promise<GrecaptchaEnterprise | null> | null = null;

function loadScript(): Promise<GrecaptchaEnterprise | null> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GrecaptchaEnterprise | null>((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.grecaptcha?.enterprise?.render) return resolve(window.grecaptcha.enterprise);

    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);

    const settle = () => {
      const api = window.grecaptcha?.enterprise;
      if (!api?.render) {
        clearTimeout(timer);
        return resolve(null);
      }
      // `enterprise.js` sets up `render` asynchronously after the script
      // element fires load; `ready` is how it tells us it's usable.
      if (api.ready) {
        api.ready(() => {
          clearTimeout(timer);
          resolve(window.grecaptcha?.enterprise ?? null);
        });
      } else {
        clearTimeout(timer);
        resolve(api);
      }
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", settle, { once: true });
    script.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { once: true }
    );
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
): Promise<VisibleCaptchaHandle | null> {
  if (!siteKey || typeof window === "undefined") return null;

  const grecaptcha = await loadScript();
  if (!grecaptcha) return null;

  try {
    const widgetId = grecaptcha.render(container, {
      sitekey: siteKey,
      size: "normal",
      callback: handlers.onToken,
      "expired-callback": handlers.onExpire,
      "error-callback": handlers.onError,
    });

    return {
      reset: () => {
        try {
          grecaptcha.reset(widgetId);
        } catch {
          /* widget already gone — nothing to clear */
        }
      },
    };
  } catch {
    return null;
  }
}

/**
 * Runs the invisible check and resolves with a token, or null if reCAPTCHA
 * could not be loaded, run, or completed. This is the one LOGIN needs.
 */
export async function getInvisibleCaptchaToken(siteKey: string): Promise<string | null> {
  if (!siteKey || typeof window === "undefined") return null;

  const grecaptcha = await loadScript();
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
