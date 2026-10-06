import { LOGO_STYLE } from "./brand";
import { SITE_URL } from "./siteConfig";

/**
 * Wraps a transactional email body in MegaDeal's branded card: the logo the
 * site's headers show (LOGO_STYLE, lib/brand.ts) on a white background. The
 * logo is a PNG flattened onto white at twice its shown size, because
 * Outlook for Windows shows neither SVG nor WebP: the minimal logo rendered
 * from public/brand/minimal/megadeal-logo-minimal-purple.svg, or the classic
 * one (public/megadeal/megadeal-logo.webp).
 *
 * `bodyHtml` is the email-specific content only (already-safe HTML — callers
 * are responsible for escaping any user-supplied text before it gets here,
 * same as before this helper existed).
 */
const EMAIL_LOGO =
  LOGO_STYLE === "minimal"
    ? { file: "megadeal-logo-email-minimal.png", width: 200, height: 42, maxWidth: 200 }
    : { file: "megadeal-logo-email.png", width: 150, height: 50, maxWidth: 170 };

export function brandedEmailHtml(bodyHtml: string): string {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;background:#ffffff;border:1px solid #f1f0f4;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px 4px;text-align:center;">
        <img src="${SITE_URL}/megadeal/${EMAIL_LOGO.file}" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="MegaDeal" style="display:inline-block;height:auto;max-width:${EMAIL_LOGO.maxWidth}px;" />
      </div>
      <div style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:#4b4358;">
        ${bodyHtml}
      </div>
    </div>
  `;
}
