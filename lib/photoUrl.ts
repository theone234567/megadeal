/**
 * Validates that a photo URL is one actually issued by our own
 * /api/upload-photo route (a Wix Media Manager URL), not an arbitrary
 * client-supplied string — the server routes that accept a photoUrl only
 * ever expect the output of that upload flow.
 */
export function isWixMediaUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith("wixstatic.com");
  } catch {
    return false;
  }
}
