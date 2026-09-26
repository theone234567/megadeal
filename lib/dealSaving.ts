/**
 * What a deal actually saves, in dollars, or null when there's nothing to
 * claim.
 *
 * The card already showed "50% OFF" and a struck-through price, and left
 * the customer to do the subtraction themselves. The subtraction is the
 * part they care about — "I save $45" is the thought that turns a scroll
 * into a click, and a percentage is a worse carrier of it as soon as the
 * numbers get real: 30% off a $900 weekend away is a shrug, "Save $270"
 * is a decision. (Under about $100 the percentage reads larger, which is
 * why both are shown rather than one replacing the other.)
 *
 * Rounded to cents before the comparison because the prices come from Wix
 * as floats: 89.99 - 44.99 is 45.000000000000006 in IEEE-754, which would
 * render as "$45.00" instead of "$45" purely because of the arithmetic.
 * Anything at or below zero is not a saving and gets nothing — a deal
 * priced at or above its "was" figure must not advertise one.
 */
export function dealSaving(was: number, now: number): number | null {
  if (!Number.isFinite(was) || !Number.isFinite(now)) return null;
  const saving = Math.round((was - now) * 100) / 100;
  return saving > 0 ? saving : null;
}

/**
 * The same saving as a whole percentage of the comparison price — derived
 * from the identical price pair the card displays, rather than the
 * separately stored discountPercent, so a badge can never disagree with
 * the two prices printed beside it.
 */
export function dealSavingPercent(was: number, now: number): number | null {
  const saving = dealSaving(was, now);
  if (saving === null || was <= 0) return null;
  const pct = Math.round((saving / was) * 100);
  return pct > 0 ? pct : null;
}
