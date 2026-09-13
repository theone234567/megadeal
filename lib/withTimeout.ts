/**
 * Rejects if `promise` hasn't settled within `ms`.
 *
 * The underlying request is not cancelled — the Wix SDK exposes no signal
 * for that — we simply stop waiting on it, so the visitor gets an error
 * they can act on instead of a button stuck on "Signing in…" forever.
 *
 * Lives here rather than in one form because both auth paths need it and
 * only signup had it: a hung login left the merchant portal unreachable
 * with no way forward and nothing on screen to explain why.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** How long to wait on a Wix auth call before giving up. */
export const AUTH_TIMEOUT_MS = 30_000;
