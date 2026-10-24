import { brandedEmailHtml } from "./emailTemplate";
import { escapeHtml } from "./escapeHtml";
import { PROFILE_FIELD_LABELS, type ReviewedField } from "./profileReview";
import { sendTransactionalEmail } from "./sendEmail";
import { SITE_URL } from "./siteConfig";

/**
 * Tells the owner an approved business changed what customers see
 * (security pack T161): what changed, from and to, and whether it went live
 * or is waiting for them. Never throws.
 */
export async function emailProfileChange(
  merchant: Record<string, any>,
  changes: Partial<Record<ReviewedField, string>>,
  held: { reason: string } | null,
): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const rows = (Object.keys(changes) as ReviewedField[])
    .map(
      (f) =>
        `<tr><td style="padding:6px 8px;vertical-align:top;font-weight:700;">${PROFILE_FIELD_LABELS[f]}</td><td style="padding:6px 8px;vertical-align:top;color:#8b8494;text-decoration:line-through;">${escapeHtml(String(merchant[f] ?? "").slice(0, 600)) || "(empty)"}</td><td style="padding:6px 8px;vertical-align:top;">${escapeHtml(String(changes[f] ?? "").slice(0, 600)) || "(empty)"}</td></tr>`,
    )
    .join("");
  const name = escapeHtml(merchant.businessName || "A business");
  const link = `${SITE_URL}/admin/businesses/${encodeURIComponent(merchant._id)}`;
  await sendTransactionalEmail({
    to,
    subject: held
      ? `Profile change to check: ${merchant.businessName || "a business"}`.slice(0, 150)
      : `Profile changed: ${merchant.businessName || "a business"}`.slice(0, 150),
    html: brandedEmailHtml(`
      <p style="margin:0 0 16px;"><strong>${name}</strong> changed its public profile.${
        held
          ? ` <strong>It's waiting for you</strong>: customers still see the previous version. Why: ${escapeHtml(held.reason)}`
          : " The automatic check passed it, so it's live."
      }</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 16px;">${rows}</table>
      <p style="margin:0;"><a href="${link}" style="color:#6D28D9;font-weight:700;">Open the business in admin</a></p>
    `),
  }).catch(() => false);
}
