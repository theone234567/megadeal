/**
 * Deal codes MegaDeal makes: a short word that fits the deal plus two
 * letters, e.g. FEASTKT or GLOWBR. Easy to read out over the phone or show
 * at a counter. One code per deal, the same for every customer; it
 * identifies the offer, nothing more (no one-use check, no reservation).
 *
 * The words are a fixed, friendly list, so nothing odd or personal comes
 * out of a business's name. The letters after them are consonants only
 * (no vowels, so they can't spell a word with the end of the word before)
 * and none that read as numbers (no L, no O, no I). More letters are added
 * only if a word's two-letter codes run out (lib/db/dealCodes.ts keeps
 * them unique). Codes made before Oct 2026 look like MEGA-7K2QD and keep
 * working as they are.
 */

const WORDS_BY_CATEGORY: Record<string, string[]> = {
  "Food & Drink": ["FEAST", "TASTE", "BITE", "DINE", "TREAT"],
  "Beauty & Spa": ["GLOW", "CALM", "BLISS", "RELAX"],
  "Things To Do": ["PLAY", "ZEST", "THRILL"],
  "Travel & Getaways": ["STAY", "TRIP", "AWAY", "ESCAPE"],
  "Health & Fitness": ["MOVE", "ZEN", "ACTIVE", "STRONG"],
  "Home & Car": ["SHINE", "TIDY", "FRESH"],
};
const ANY_DEAL = ["DEAL", "TREAT", "LOCAL"];

const ALL_WORDS = [...new Set([...Object.values(WORDS_BY_CATEGORY).flat(), ...ANY_DEAL])];
export const SUFFIX_LETTERS = "BCDFGHJKMNPRSTVWXZ";

/** A MegaDeal-made code of the new kind (MEGA- codes are checked
 *  separately). Businesses can't choose one of these for their own. */
export const MEMORABLE_CODE_RE = new RegExp(`^(${ALL_WORDS.join("|")})[${SUFFIX_LETTERS}]{2,4}$`);

export function isMemorableCode(code: string | null | undefined): boolean {
  return Boolean(code && MEMORABLE_CODE_RE.test(code));
}

/** One candidate code for a deal in this category, with `letters` letters
 *  after the word. `random` is for tests. */
export function memorableCandidate(category: string | null | undefined, letters = 2, random: () => number = Math.random): string {
  const words = (category && WORDS_BY_CATEGORY[category]) || ANY_DEAL;
  const word = words[Math.floor(random() * words.length)];
  let suffix = "";
  for (let i = 0; i < letters; i++) suffix += SUFFIX_LETTERS[Math.floor(random() * SUFFIX_LETTERS.length)];
  return word + suffix;
}
