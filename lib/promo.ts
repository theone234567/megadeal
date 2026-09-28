/**
 * The business signup offer, in one place.
 *
 * Before launch: WELCOME6, up to 6 months of free advertising (24
 * credits) for businesses approved before launch. From launch: WELCOME3,
 * up to 3 months (12 credits). The owner's decision (28 Sep 2026): the
 * offer drops to 3 months at launch; anyone approved before launch keeps
 * their 6 months.
 *
 * Which one applies is decided by SITE_LAUNCHED, passed in rather than
 * imported, so a client component gets it from the server page that
 * renders it (the runtime SITE_LAUNCHED variable isn't visible in the
 * browser).
 */
export interface Promo {
  code: string;
  months: number;
  credits: number;
}

export const PRELAUNCH_PROMO: Promo = { code: "WELCOME6", months: 6, credits: 24 };
export const LAUNCH_PROMO: Promo = { code: "WELCOME3", months: 3, credits: 12 };

export function currentPromo(launched: boolean): Promo {
  return launched ? LAUNCH_PROMO : PRELAUNCH_PROMO;
}

/**
 * The offer a code entered at signup earns when an admin approves the
 * business, or null if it isn't a promo code (it may be a referral code).
 *
 * After launch WELCOME6 still counts, as the current 3-month offer: a
 * business that applied before launch but is approved after it typed the
 * code in good faith, and the 6 months was for approval before launch.
 * Before launch WELCOME3 isn't valid yet.
 */
export function promoForCode(code: string, launched: boolean): Promo | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  if (launched) return c === LAUNCH_PROMO.code || c === PRELAUNCH_PROMO.code ? LAUNCH_PROMO : null;
  return c === PRELAUNCH_PROMO.code ? PRELAUNCH_PROMO : null;
}

/** "Up to 6 months free advertising", for the current offer. */
export function promoHeadline(p: Promo): string {
  return `up to ${p.months} months free advertising`;
}
