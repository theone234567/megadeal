/**
 * Deal credits each side gets when a business signs up with another's
 * referral link and is approved: the new business and the one that
 * referred it. Granted in /api/admin/merchants/[id] on approval; shown
 * on the portal's "Refer a business" card. One number for both, so the
 * card can't promise a different amount from what's given.
 */
export const REFERRAL_BONUS_CREDITS: number = 4;

export const referralCreditsLabel = `${REFERRAL_BONUS_CREDITS} bonus deal credit${REFERRAL_BONUS_CREDITS === 1 ? "" : "s"}`;
