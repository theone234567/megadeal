/**
 * Deal credits each side gets when a business signs up with another's
 * referral link and is approved: the new business and the one that
 * referred it. Granted in /api/admin/merchants/[id] on approval; shown
 * on the portal's "Refer a business" card. One number for both, so the
 * card can't promise a different amount from what's given.
 */
export const REFERRAL_BONUS_CREDITS: number = 4;

export const referralCreditsLabel = `${REFERRAL_BONUS_CREDITS} bonus deal credit${REFERRAL_BONUS_CREDITS === 1 ? "" : "s"}`;

/**
 * What a business's signup codes earn on approval. The launch offer
 * (couponCode) and a referral (referredByCode) apply together: the owner's
 * decision (Oct 2026), so a referred business never has to choose between
 * its welcome offer and the bonus that pays the business that sent it.
 *
 * Applications from before the separate referral box kept a referral code
 * in couponCode. A couponCode that isn't a promo code is still read as a
 * referral, as it always was.
 */
export function signupCodes(
  merchant: Record<string, any>,
  isPromoCode: (code: string) => boolean
): { promoCode: string; referralCode: string } {
  const coupon = String(merchant.couponCode ?? "").trim().toUpperCase();
  const referred = String(merchant.referredByCode ?? "").trim().toUpperCase();
  const couponIsPromo = coupon !== "" && isPromoCode(coupon);
  return {
    promoCode: couponIsPromo ? coupon : "",
    referralCode: referred || (couponIsPromo ? "" : coupon),
  };
}
