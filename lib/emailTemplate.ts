import { SITE_URL } from "./siteConfig";

/**
 * Wraps a transactional email body in MegaDeal's branded card: the real
 * logo (the same public/megadeal/megadeal-logo.webp file Header.tsx renders
 * on every page) on a white background, matching how it actually looks on
 * the site — this asset has its own solid white background baked in, so it
 * can't sit on a coloured header without a visible white box around it.
 *
 * `bodyHtml` is the email-specific content only (already-safe HTML — callers
 * are responsible for escaping any user-supplied text before it gets here,
 * same as before this helper existed).
 */
export function brandedEmailHtml(bodyHtml: string): string {
  return `
    <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;background:#ffffff;border:1px solid #f1f0f4;border-radius:20px;overflow:hidden;">
      <div style="padding:28px 32px 4px;text-align:center;">
        <img src="${SITE_URL}/megadeal/megadeal-logo.webp" width="150" height="50" alt="MegaDeal" style="display:inline-block;height:auto;max-width:170px;" />
      </div>
      <div style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:#4b4358;">
        ${bodyHtml}
      </div>
    </div>
  `;
}
