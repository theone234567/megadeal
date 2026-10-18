/**
 * Names (a business's, its contact's, its legal name, a deal's) are plain
 * words. "<" and ">" are never part of one, and are how pasted code or
 * markup starts. The pages show such text safely as text either way;
 * refusing it keeps listings clean and tells the business why.
 */
export const NAME_MARKUP_MESSAGE = "Use letters, numbers and everyday punctuation. The < and > characters can't be used.";

export function hasMarkup(value: string): boolean {
  return /[<>]/.test(value);
}

/** For an <input pattern>: anything without < or >. */
export const NO_MARKUP_PATTERN = "[^<>]*";
