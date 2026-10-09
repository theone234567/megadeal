/**
 * Cloudflare Turnstile in the browser: a token proving a person (not a
 * script) is submitting, checked on the server (lib/turnstile.ts). Runs
 * invisibly; Cloudflare only shows a challenge to someone it finds
 * suspicious. The site key is public (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
 */

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<Turnstile | null> | null = null;

function load(): Promise<Turnstile | null> {
  const w = window as unknown as { turnstile?: Turnstile };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  loading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve(w.turnstile ?? null);
    s.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Starts loading early (on the form appearing), so submit isn't kept waiting. */
export function preloadTurnstile(): void {
  if (typeof window !== "undefined") void load();
}

/**
 * A fresh single-use token, or null if the check couldn't run (blocked
 * script, timeout). The server refuses a missing token, so the form shows
 * its usual "security check didn't pass" message rather than failing
 * silently. A challenge, when one is shown, goes in `slot` (the form's
 * own, where a page has several forms), else the page's
 * [data-turnstile-slot].
 */
/** Why the last check gave no token, for the form to say: "blocked" (the
 *  script didn't load), "error" (Cloudflare's widget reported one, with
 *  its code) or "timeout" (a challenge was shown and not completed). */
export let lastTurnstileProblem: { kind: "blocked" | "error" | "timeout"; code?: string } | null = null;

/** What to tell someone whose robot check couldn't run. */
export function turnstileProblemMessage(): string {
  const p = lastTurnstileProblem;
  if (p?.kind === "timeout") return "Please complete the security check below the form, then press the button again.";
  if (p?.kind === "blocked") {
    return "The security check couldn't load in your browser. If you use an ad or script blocker, allow megadeal.co.nz (and challenges.cloudflare.com), then try again.";
  }
  return `The security check couldn't run in your browser${p?.code ? ` (code ${p.code})` : ""}. Please refresh the page and try again; if it keeps happening, try another browser.`;
}

/**
 * A token, trying once more if the first check fails outright (a blip in
 * Cloudflare's widget). Null if neither worked: lastTurnstileProblem says
 * why.
 */
export async function getTurnstileToken(siteKey: string, timeoutMs = 30_000, slot?: HTMLElement | null): Promise<string | null> {
  const first = await turnstileTokenOnce(siteKey, timeoutMs, slot);
  if (first || !siteKey || lastTurnstileProblem?.kind !== "error") return first;
  return turnstileTokenOnce(siteKey, timeoutMs, slot);
}

async function turnstileTokenOnce(siteKey: string, timeoutMs: number, slot?: HTMLElement | null): Promise<string | null> {
  lastTurnstileProblem = null;
  if (!siteKey) return null;
  const t = await load();
  if (!t) {
    lastTurnstileProblem = { kind: "blocked" };
    return null;
  }
  const host = document.createElement("div");
  host.className = "turnstile-host";
  host.style.margin = "12px 0";
  (slot ?? document.querySelector("[data-turnstile-slot]") ?? document.body).appendChild(host);
  return new Promise((resolve) => {
    let id = "";
    const done = (token: string | null) => {
      clearTimeout(timer);
      try {
        if (id) t.remove(id);
      } catch {
        // already gone
      }
      host.remove();
      resolve(token);
    };
    const timer = setTimeout(() => {
      lastTurnstileProblem = { kind: "timeout" };
      done(null);
    }, timeoutMs);
    id = t.render(host, {
      sitekey: siteKey,
      appearance: "interaction-only",
      execution: "render",
      callback: (token: string) => done(token),
      "error-callback": (code?: string | number) => {
        lastTurnstileProblem = { kind: "error", code: code === undefined ? undefined : String(code).slice(0, 12) };
        done(null);
      },
      "expired-callback": () => {
        lastTurnstileProblem = { kind: "timeout" };
        done(null);
      },
    });
  });
}
