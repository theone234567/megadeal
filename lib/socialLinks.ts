const SOCIAL_HOST_PATTERNS: Record<"facebook" | "instagram", RegExp> = {
  facebook: /^(www\.|m\.|web\.)?facebook\.com$/i,
  instagram: /^(www\.)?instagram\.com$/i,
};

/** True for an empty string (both fields are optional) or a URL whose host
 * actually matches the given platform — stops a merchant pasting an
 * unrelated link into the Facebook/Instagram field, by accident or not. */
export function isValidSocialUrl(url: string, platform: "facebook" | "instagram"): boolean {
  if (!url) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  return SOCIAL_HOST_PATTERNS[platform].test(parsed.hostname);
}
