/**
 * The reasons an admin picks from when changing a business's credits by
 * hand (Admin → Businesses → a business). The business sees the reason in
 * its activity ("Credits adjusted by MegaDeal: …") and, for credits added,
 * in the email telling it ("We've added 5 deal credits to your account:
 * …"), so each reads as the end of that sentence, in words a business
 * would use. "Other" lets the admin write one instead.
 */
export const CREDIT_REASONS_ADDED = [
  "a thank-you from the MegaDeal team",
  "a top-up for joining us before launch",
  "a refund for a deal that didn't go ahead",
  "a correction to your balance",
] as const;

export const CREDIT_REASONS_REMOVED = [
  "a correction to your balance",
  "credits that were added by mistake",
] as const;

export const OTHER_CREDIT_REASON = "other";

export function creditReasonsFor(delta: number): readonly string[] {
  return delta < 0 ? CREDIT_REASONS_REMOVED : CREDIT_REASONS_ADDED;
}
