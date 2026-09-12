/**
 * Invisible reCAPTCHA, for Wix member registration.
 *
 * Wix's registerV2 rejects a signup with errorCode "missingCaptchaToken"
 * when the site has CAPTCHA protection on and no token is supplied — the
 * merchant signup form hit exactly that and nobody could create an
 * account. The Wix SDK accepts the token via `captchaTokens` on
 * register/login and publishes the site key to use as
 * `client.auth.captchaInvisibleSiteKey`, so this is the missing half of
 * that handshake rather than a third-party bolt-on.
 *
 * "Invisible" means no checkbox: reCAPTCHA scores the interaction
 * silently and only interrupts the visitor with a challenge when it is
 * genuinely unsure.
 *
 * Every failure path here resolves to null rather than throwing. A
 * missing token is exactly the state the form is already in, so the
 * worst case is the error the visitor would have seen anyway — this can
 * never turn a working signup into a broken one.
 */

const SCRIPT_ID = "megadeal-recaptcha";
const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

/** Deliberately short. Without a token the registration is going to fail
 *  anyway, so waiting longer only delays the error — and the script is
 *  normally warmed by preloadCaptcha() long before anyone submits, which
 *  keeps this off the critical path entirely. */
const LOAD_TIMEOUT_MS = 6_000;
const EXECUTE_TIMEOUT_MS = 45_000;

type Grecaptcha = {
  render: (
    container: HTMLElement,
    options: { sitekey: string; size: "invisible"; callback: (token: string) => void; "error-callback": () => void }
  ) => number;
  execute: (widgetId: number) => void;
  reset: (widgetId: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha & { ready?: (cb: () => void) => void };
  }
}

let scriptPromise: Promise<Grecaptcha | null> | null = null;
let widgetId: number | null = null;
let container: HTMLElement | null = null;
/** Resolver for the currently running execute(), if any. */
let pending: ((token: string | null) => void) | null = null;

function loadScript(): Promise<Grecaptcha | null> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<Grecaptcha | null>((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.grecaptcha?.render) return resolve(window.grecaptcha);

    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve(window.grecaptcha?.render ? window.grecaptcha : null);
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
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => {
      clearTimeout(timer);
      resolve(null);
    }, { once: true });
  });

  return scriptPromise;
}

/**
 * Starts fetching reCAPTCHA without waiting for it. Call this when a form
 * that will need a token mounts, so the script is already warm by the
 * time someone finishes typing and the check adds nothing to the time
 * between pressing the button and the request going out.
 */
export function preloadCaptcha(): void {
  if (typeof window === "undefined") return;
  void loadScript();
}

/**
 * Runs the invisible check and resolves with a token, or null if
 * reCAPTCHA could not be loaded, run, or completed.
 */
export async function getInvisibleCaptchaToken(siteKey: string): Promise<string | null> {
  if (!siteKey || typeof window === "undefined") return null;

  const grecaptcha = await loadScript();
  if (!grecaptcha) return null;

  try {
    if (widgetId === null) {
      container = document.createElement("div");
      // Kept out of the layout entirely; the challenge popup, when one is
      // needed, is rendered by reCAPTCHA in its own overlay.
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.setAttribute("aria-hidden", "true");
      document.body.appendChild(container);

      widgetId = grecaptcha.render(container, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token) => {
          pending?.(token);
          pending = null;
        },
        "error-callback": () => {
          pending?.(null);
          pending = null;
        },
      });
    } else {
      grecaptcha.reset(widgetId);
    }

    return await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        // The visitor closed the challenge, or it never came back.
        if (pending) {
          pending = null;
          resolve(null);
        }
      }, EXECUTE_TIMEOUT_MS);

      pending = (token) => {
        clearTimeout(timer);
        resolve(token);
      };

      try {
        grecaptcha.execute(widgetId as number);
      } catch {
        clearTimeout(timer);
        pending = null;
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}
