/**
 * Whether a password has turned up in a known data breach, from Have I
 * Been Pwned's Pwned Passwords (free, no key). Supabase only checks this
 * on its paid plan, so the site asks itself before a business sets one.
 *
 * The password never leaves the server: only the first 5 characters of
 * its SHA-1 hash are sent ("k-anonymity"), and the answer lists every
 * breached hash starting with them (padded, so its size doesn't hint at
 * the password either). The rest of the match happens here.
 *
 * null when the service can't be asked (down, slow): the caller lets the
 * password through then rather than block a sign-up on someone else's
 * outage; the length rule still applies.
 */

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function passwordSeenInBreaches(password: string, fetchFn: Fetch = fetch): Promise<boolean | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);
    const res = await fetchFn(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "MegaDeal (megadeal.co.nz)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split("\n")) {
      const [candidate, count] = line.trim().split(":");
      // Padding lines carry a count of 0.
      if (candidate === suffix) return Number(count) > 0;
    }
    return false;
  } catch {
    return null;
  }
}

export const BREACHED_PASSWORD_MESSAGE =
  "That password has appeared in a data breach on another site, so it's one of the first that gets tried. Please choose a different one.";
