const SOCIAL_HOST_PATTERNS: Record<"facebook" | "instagram", RegExp> = {
  facebook: /^(www\.|m\.|web\.)?facebook\.com$/i,
  instagram: /^(www\.)?instagram\.com$/i,
};

/** True for an empty string (both fields are optional) or a URL whose host
 * actually matches the given platform — stops a merchant pasting an
 * unrelated link into the Facebook/Instagram field, by accident or not.
 * Same "assume https if no scheme was typed" convention as
 * isSafeOptionalUrl below, since people very often paste
 * "facebook.com/yourbusiness" without a leading https://. */
export function isValidSocialUrl(url: string, platform: "facebook" | "instagram"): boolean {
  if (!url) return true;
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  return SOCIAL_HOST_PATTERNS[platform].test(parsed.hostname);
}

/** True for an empty string (both fields are optional) or anything that
 * resolves to a plain http(s) link — same "assume https if no scheme was
 * typed" convention the public business page already displays these with,
 * so anything that passes here renders exactly as validated. Rejects
 * dangerous schemes (javascript:, data:, etc.) explicitly rather than
 * relying on how a display page happens to render the value. */
export function isSafeOptionalUrl(url: string): boolean {
  if (!url) return true;
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
