import "server-only";

/**
 * Wrong tries at the 6-digit email code (security pack T157). The code
 * itself lives with Supabase Auth, which can't be told to drop it, so after
 * MAX_WRONG_CODES wrong tries for an address the site stops checking codes
 * for it until a new one is sent (resend or sign-up again), which replaces
 * the old code. Counted per address, whoever is guessing; the same answer
 * whether or not the address has an account.
 */
export const MAX_WRONG_CODES = 5;
/** As long as a code can last (10 minutes), and a little more. */
const WINDOW_SECONDS = 15 * 60;

const key = (email: string) => `code-wrong:${email.toLowerCase()}`;

async function store() {
  return import("./securityStore");
}

export async function wrongCodesSoFar(email: string): Promise<number> {
  const n = await (await store()).countSoFar(key(email));
  return n === "unavailable" ? 0 : n;
}

/** Counts a wrong try; returns how many tries are left for this code. */
export async function noteWrongCode(email: string): Promise<number> {
  const n = await (await store()).countInDatabase(key(email), WINDOW_SECONDS);
  return n === "unavailable" ? MAX_WRONG_CODES : Math.max(0, MAX_WRONG_CODES - n);
}

/** A new code went out, or the right one was used: start again. */
export async function clearWrongCodes(email: string): Promise<void> {
  await (await store()).clearCount(key(email));
}

export const TOO_MANY_WRONG_CODES =
  "That code has had too many wrong tries, so it no longer works. Send yourself a new code and use that one.";
