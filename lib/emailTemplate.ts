import { SITE_URL } from "./siteConfig";

/**
 * Wraps a transactional email body in MegaDeal's branded card: the real
 * logo on a white background, matching how it looks on the site. The logo
 * is a PNG copy of the one Header.tsx renders (public/megadeal/
 * megadeal-logo.webp), flattened onto white at twice its shown size:
 * Outlook for Windows doesn't show WebP images at all.
 *
 * `bodyHtml` is the email-specific content only (already-safe HTML — callers
 * are responsible for escaping any user-supplied text before it gets here,
 * same as before this helper existed).
 */
export function brandedEmailHtml(bodyHtml: string): string {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;background:#ffffff;border:1px solid #f1f0f4;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px 4px;text-align:center;">
        <img src="${SITE_URL}/megadeal/megadeal-logo-email.png" width="150" height="50" alt="MegaDeal" style="display:inline-block;height:auto;max-width:170px;" />
      </div>
      <div style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:#4b4358;">
        ${bodyHtml}
      </div>
    </div>
  `;
}
