/**
 * A sign-up waiting for its email code (security pack T172): kept for this
 * tab only (sessionStorage), so Refresh, or Back then Forward, brings the
 * code screen back instead of losing it. Holds the email and the
 * application's few fields to send once the email is confirmed; never the
 * password or the code. Forgotten after 30 minutes, once used, or when the
 * visitor chooses to use a different email.
 */
const KEY = "md-signup-pending";
const MAX_AGE_MS = 30 * 60 * 1000;

export function savePendingSignup<T>(email: string, application: T): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ email, application, at: Date.now() }));
  } catch {
    // Private mode or storage off: the code screen just won't survive a refresh.
  }
}

export function readPendingSignup<T>(): { email: string; application: T } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.email !== "string" || !p.email || typeof p.at !== "number" || Date.now() - p.at > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return { email: p.email, application: p.application as T };
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
