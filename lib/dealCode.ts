// Excludes visually ambiguous characters (0/O, 1/I/L) so a code read aloud
// or typed by hand doesn't get misheard/mistyped.
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * A short, static reference code shown on a deal's page for the customer
 * to quote when they contact or book with the business — lets the
 * business recognise a MegaDeal lead at a glance. This is a lightweight
 * identifier, not a redemption token: it's the same code for every
 * customer of that deal, generated once when the deal is created.
 */
export function generateDealCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `MEGA-${code}`;
}
