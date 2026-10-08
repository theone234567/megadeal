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
export async function getTurnstileToken(siteKey: string, timeoutMs = 30_000, slot?: HTMLElement | null): Promise<string | null> {
  if (!siteKey) return null;
  const t = await load();
  if (!t) return null;
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
    const timer = setTimeout(() => done(null), timeoutMs);
    id = t.render(host, {
      sitekey: siteKey,
      appearance: "interaction-only",
      execution: "render",
      callback: (token: string) => done(token),
      "error-callback": () => done(null),
      "expired-callback": () => done(null),
    });
  });
}
