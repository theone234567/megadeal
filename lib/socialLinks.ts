const SOCIAL_HOST_PATTERNS: Record<"facebook" | "instagram", RegExp> = {
  facebook: /^(www\.|m\.|web\.)?facebook\.com$/i,
  instagram: /^(www\.)?instagram\.com$/i,
};

/** Handles as each platform allows them: Instagram letters, digits, "."
 *  and "_" (up to 30); Facebook letters, digits and "." (5 to 50). */
const HANDLE_PATTERNS: Record<"facebook" | "instagram", RegExp> = {
  facebook: /^[a-z0-9.]{5,50}$/i,
  instagram: /^[a-z0-9._]{1,30}$/i,
};

/**
 * A Facebook or Instagram link as it's stored and shown (T249), or null
 * when it isn't one: "" for blank (both are optional); "@yourcafe" (or
 * just "yourcafe") becomes the page's address; http becomes https;
 * tracking query strings and #fragments are dropped (Facebook's
 * profile.php?id= keeps its id, the only query that names a page); a bare
 * "instagram.com/" with no page is refused. Same "assume https if no scheme
 * was typed" convention as isSafeOptionalUrl below, since people very often
 * paste "facebook.com/yourbusiness" without a leading https://.
 */
export function normaliseSocialUrl(input: string, platform: "facebook" | "instagram"): string | null {
  const value = (input ?? "").trim();
  if (!value) return "";
  const handle = value.replace(/^@/, "");
  if ((value.startsWith("@") || !/[./:]/.test(value)) && HANDLE_PATTERNS[platform].test(handle)) {
    return `https://www.${platform}.com/${handle}`;
  }
  // Same scheme rule as isSafeOptionalUrl (and the database).
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  if (/\s/.test(candidate)) return null;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!SOCIAL_HOST_PATTERNS[platform].test(parsed.hostname)) return null;
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path) return null;
  const id = platform === "facebook" && /^\/profile\.php$/i.test(path) ? parsed.searchParams.get("id") : null;
  if (/^\/profile\.php$/i.test(path) && !(id && /^\d{1,25}$/.test(id))) return null;
  return `https://${parsed.hostname.toLowerCase()}${path}${id ? `?id=${id}` : ""}`;
}

/** True for an empty string or anything normaliseSocialUrl accepts: a
 *  link to that platform (or a handle), never an unrelated site. */
export function isValidSocialUrl(url: string, platform: "facebook" | "instagram"): boolean {
  return normaliseSocialUrl(url, platform) !== null;
}

/** True for an empty string (both fields are optional) or anything that
 * resolves to a plain http(s) link — same "assume https if no scheme was
 * typed" convention the public business page already displays these with,
 * so anything that passes here renders exactly as validated. Rejects
 * dangerous schemes (javascript:, data:, etc.) explicitly rather than
 * relying on how a display page happens to render the value. */
/**
 * A host a public link can point at (security pack T140): a real domain
 * name with a dot and a top-level domain ("yourcafe.co.nz"), not
 * "example", "localhost", an IP address or a host made of stray
 * characters.
 */
export function isPublicWebHost(hostname: string): boolean {
  return (
    /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/i.test(hostname) &&
    !isReservedHost(hostname)
  );
}

/** Names set aside for documentation and testing (RFC 2606, RFC 6761):
 *  example.com/.net/.org and anything under .example, .test, .invalid or
 *  .localhost. Never a real business's site (T249). */
function isReservedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return /(^|\.)example\.(com|net|org)$/.test(h) || /\.(example|test|invalid|localhost)$/.test(h);
}

export function isSafeOptionalUrl(url: string): boolean {
  if (!url) return true;
  // The rule the database applies when it stores a link (lib/db/wixShim.ts
  // `link`): anything that starts like a scheme ("javascript:", "data:")
  // has to be http(s) itself, and no spaces. "javascript://%0a…" used to
  // pass here (as https://javascript//…) and then fail the save with a 500.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  if (/\s/.test(candidate)) return false;
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && isPublicWebHost(parsed.hostname);
  } catch {
    return false;
  }
}

/** The href to render for a stored business link, or null when it isn't a
 * plain http(s) URL — same "assume https if no scheme was typed" rule as
 * isSafeOptionalUrl, so what validates is exactly what renders. */
export function safeWebHref(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && isPublicWebHost(parsed.hostname) ? parsed.href : null;
  } catch {
    return null;
  }
}
