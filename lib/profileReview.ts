import { decideAiOutcome, reviewWithAi, type AiReview } from "./aiReview";
import { getSiteRudenessCheck, rudenessCheckApplies } from "./rudenessSetting";

/**
 * Re-checking an approved business's profile edits (security pack T161,
 * with the owner's "check the About text when it's saved, and hold
 * anything flagged" of 24 Oct). Changes to the About text, links, booking
 * email or public phone could turn a genuine listing into a phishing page
 * or a "please do not publish" one after approval, so they're checked:
 *
 * - clean (the automatic check approves): they go live at once, and the
 *   owner is emailed what changed;
 * - flagged, placeholder wording, or the check unavailable: they wait in
 *   `pendingProfile` for an admin, and the public page keeps the previous
 *   values until then.
 *
 * A business waiting for approval edits freely: everything is looked at
 * when it's approved. Hours, address, photos and the rest aren't checked
 * here (name, legal name, NZBN, category and photos already send the
 * business back for approval, lib/merchant.ts).
 */
export { PROFILE_FIELD_LABELS, REVIEWED_PROFILE_FIELDS, type ReviewedField } from "./profileReviewRules";
import { REVIEWED_PROFILE_FIELDS, placeholderBio, type ReviewedField } from "./profileReviewRules";

export function placeholderProblem(text: string | null | undefined): string | null {
  return placeholderBio(text) ? "The About text reads like placeholder or test wording, not a description of the business." : null;
}

const LINK_FIELDS = new Set(["website", "bookingUrl", "facebookUrl", "instagramUrl"]);
/** Compared as stored: links are kept with https:// added and a trailing
 *  slash makes no difference, so "yourcafe.co.nz" isn't a change from
 *  "https://yourcafe.co.nz". */
const norm = (field: string, v: unknown) => {
  const text = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return LINK_FIELDS.has(field) ? text.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase() : text;
};

/** The checked fields this save would change, with their new values. */
export function profileChanges(existing: Record<string, any>, next: Partial<Record<ReviewedField, string>>): Partial<Record<ReviewedField, string>> {
  const out: Partial<Record<ReviewedField, string>> = {};
  for (const f of REVIEWED_PROFILE_FIELDS) {
    if (f in next && norm(f, next[f]) !== norm(f, existing[f])) out[f] = (next[f] ?? "").trim();
  }
  return out;
}

export interface ProfileDecision {
  hold: boolean;
  /** Why it's held, for the admin; null when it went live. */
  reason: string | null;
  review: AiReview | null;
}

export async function reviewProfileChanges(
  adminClient: any,
  merchant: Record<string, any>,
  changes: Partial<Record<ReviewedField, string>>,
): Promise<ProfileDecision> {
  const after: Record<string, any> = { ...merchant, ...changes };
  const placeholder = placeholderProblem(after.bio);
  if (placeholder) return { hold: true, reason: placeholder, review: null };
  const rudenessCheck = rudenessCheckApplies(await getSiteRudenessCheck(adminClient), merchant.rudenessCheck);
  const contact = [
    after.website && `Website: ${after.website}`,
    after.bookingUrl && `Booking link: ${after.bookingUrl}`,
    after.bookingEmail && `Booking email: ${after.bookingEmail}`,
    after.phone && `Phone: ${after.phone}`,
    after.facebookUrl && `Facebook: ${after.facebookUrl}`,
    after.instagramUrl && `Instagram: ${after.instagramUrl}`,
  ].filter(Boolean);
  const review = await reviewWithAi({
    kind: "profile",
    dealName: after.businessName || "",
    businessName: after.businessName || null,
    category: after.category || undefined,
    description: after.bio || "",
    terms: contact.join("\n"),
    allowRudeLanguage: !rudenessCheck,
  });
  if (!review) return { hold: true, reason: "The automatic check wasn't available, so a person needs to look.", review: null };
  const outcome = decideAiOutcome(review, true, rudenessCheck);
  if (outcome === "publish") return { hold: false, reason: null, review };
  return { hold: true, reason: review.reasons.join("; ") || "The automatic check wasn't sure about it.", review };
}

/**
 * The business's own record as the portal gets it: the changes it's
 * waiting on shown in place (so the form shows what it saved) and listed
 * in `pendingFields`; the check's notes for the admin left out.
 */
export function merchantForBusiness<T extends Record<string, any> | null | undefined>(merchant: T): T {
  if (!merchant) return merchant;
  const pending = merchant.pendingProfile && typeof merchant.pendingProfile === "object" ? merchant.pendingProfile : null;
  const out: Record<string, any> = { ...merchant, ...(pending ?? {}), pendingFields: pending ? Object.keys(pending) : [] };
  delete out.pendingProfile;
  delete out.pendingProfileReview;
  return out as T;
}
