/** The signed-in member's sign-in has run out; they need to sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your sign-in has expired.");
  }
}

/**
 * Loads the signed-in business's record for the portal. One failed request
 * — a network blip, a Wix hiccup, a deploy rolling over — used to strand the
 * business on "Couldn't load your account", so a failure is retried once
 * before giving up. An expired sign-in isn't retried: it throws
 * SessionExpiredError so the page can ask them to sign in again.
 */
export async function fetchMerchantMe(): Promise<{ item: any; siteLaunched?: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/merchants/me");
      if (res.status === 401) throw new SessionExpiredError();
      if (res.ok) return await res.json();
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Couldn't load your account.");
}
