/**
 * Tags links to MegaDeal's own site in an email with
 * utm_source=email&utm_medium=transactional&utm_campaign=<campaign>, so
 * visits from emails show as email in Google Analytics rather than
 * "direct" (T246). Links elsewhere, links already tagged, and mailto/tel
 * links are left as they are. The site's edge cache ignores these
 * parameters, so tagged visits are served the same cached pages.
 */
export function withEmailUtm(html: string, siteUrl: string, campaign = "notification"): string {
  const origin = siteUrl.replace(/\/$/, "");
  const tag = `utm_source=email&utm_medium=transactional&utm_campaign=${encodeURIComponent(campaign)}`;
  return html.replace(/href="([^"]+)"/g, (whole, href: string) => {
    if (!(href === origin || href.startsWith(`${origin}/`) || href.startsWith(`${origin}?`) || href.startsWith(`${origin}#`))) return whole;
    if (/[?&](amp;)?utm_/.test(href)) return whole;
    const hash = href.indexOf("#");
    const [path, fragment] = hash === -1 ? [href, ""] : [href.slice(0, hash), href.slice(hash)];
    // Inside an HTML attribute, so "&" is written as "&amp;".
    const joined = `${path}${path.includes("?") ? "&amp;" : "?"}${tag.replace(/&/g, "&amp;")}`;
    return `href="${joined}${fragment}"`;
  });
}
