/**
 * Escapes text before interpolating it into an HTML email template.
 * Merchant-supplied fields (business name, bio) reach these templates
 * unsanitized — without this, a merchant could inject markup or a spoofed
 * link into an email that goes to someone else entirely (e.g. the referral
 * bonus email sent to whoever referred them), not just themselves.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
