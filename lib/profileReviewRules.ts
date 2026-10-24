/** The profile fields re-checked after approval (lib/profileReview.ts),
 *  kept free of anything server-only for the admin page. */
export const REVIEWED_PROFILE_FIELDS = ["bio", "website", "bookingUrl", "bookingEmail", "phone", "facebookUrl", "instagramUrl"] as const;
export type ReviewedField = (typeof REVIEWED_PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ReviewedField, string> = {
  bio: "About text",
  website: "Website",
  bookingUrl: "Booking link",
  bookingEmail: "Booking email",
  phone: "Phone",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
};

/** Wording that means a listing isn't ready for customers. */
const PLACEHOLDER_RE =
  /\b(?:please\s+do\s+not\s+publish|do\s+not\s+publish|don'?t\s+publish|not\s+a\s+real\s+(?:business|offer|listing)|lorem\s+ipsum|placeholder\s+text|test\s+listing|qa\s+test|dummy\s+text|ignore\s+this)\b/i;

export function placeholderBio(text: unknown): boolean {
  return typeof text === "string" && PLACEHOLDER_RE.test(text);
}
