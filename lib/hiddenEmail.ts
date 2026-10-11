/**
 * A business's public booking email, kept out of the page's HTML so the
 * address-harvesting bots that read raw pages for "name@domain" (and then
 * spam the business) don't find it. People still see it: the browser turns
 * it back into the address once the page is running.
 *
 * Not encryption, and not meant to be: the address is public by the
 * business's choice. Encoding it just means a plain text scan of the page
 * finds nothing that looks like an email.
 */

const PREFIX = "h1:";

/** The address encoded for the page (null stays null). */
export function hideEmail(email: string | null | undefined): string | null {
  const address = (email ?? "").trim();
  if (!address) return null;
  return PREFIX + btoa(encodeURIComponent(address).split("").reverse().join(""));
}

/** The address back from hideEmail(). Anything else is returned as it is
 *  (a preview's plain address); something undecodable gives null. */
export function revealEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value;
  try {
    return decodeURIComponent(atob(value.slice(PREFIX.length)).split("").reverse().join(""));
  } catch {
    return null;
  }
}
