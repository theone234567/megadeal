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
    if (parsed.protocol !== "https:") return false;
    // endsWith("wixstatic.com") alone also matches evil-wixstatic.com and
    // notwixstatic.com — any host an attacker can register. A merchant
    // could then point a deal or logo photo at a server they control and
    // have it served from our pages. The dot matters: either the domain
    // itself, or something genuinely beneath it.
    const host = parsed.hostname.toLowerCase();
    return host === "wixstatic.com" || host.endsWith(".wixstatic.com");
  } catch {
    return false;
  }
}
