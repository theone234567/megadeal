import type { Deal } from "./types";
import { dealTagLabel } from "./dealTags";
import { htmlToText } from "./htmlText";

/**
 * The homepage search (lib/homeFilters.ts matchDeals). It used to look for
 * the whole query as one piece of text, so the searches people actually
 * type often found nothing (local test, Oct 2026): "brunch ponsonby" (no
 * deal says that phrase), "café" against "cafe", or "cafe" for a deal at an
 * espresso bar. Now each word has to be found somewhere in the deal, accents
 * and plurals aside, and a few plain words stand for a whole category.
 */

/** Lower case, accents off: "Café" and "cafe" are the same word. */
export function foldText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Words that narrow nothing down ("massage deals near ponsonby"). */
const IGNORED = new Set([
  "a", "an", "and", "at", "deal", "deals", "for", "in", "near", "of", "offer", "offers", "on", "the", "to", "with",
  // "coffee near me", "best brunch nearby" (T252): these found nothing.
  "me", "my", "i", "nearby", "around", "close", "closest", "nearest", "best", "good", "cheap", "cheapest", "local", "today",
]);

/** Emoji people type for what they want (T252): "🍕" is a pizza search. */
const EMOJI_WORDS: Record<string, string> = {
  "🍕": "pizza", "☕": "coffee", "🍔": "burger", "🍣": "sushi", "🍜": "noodles", "🍺": "beer", "🍷": "wine",
  "🍰": "cake", "🥐": "pastry", "🥞": "brunch", "🍦": "ice cream", "💆": "massage", "💅": "nails", "💇": "hair",
  "🏋": "gym", "🧖": "spa", "🚗": "car", "🏨": "hotel", "🎳": "bowling", "⛳": "golf",
};

/** A query of only symbols that mean nothing here: matches no deal rather
 *  than every deal. */
const NOTHING = "\u0000";

/**
 * The everyday words for each category: a search for "cafe" or "gym" finds
 * that category's deals even when the business didn't use the word. Broad
 * words only; a specific one ("massage", "pizza") has to be in the deal
 * itself, so it doesn't bring up every deal in the category.
 */
const CATEGORY_WORDS: Record<string, string[]> = {
  "Food & Drink": ["food", "eat", "eats", "eating", "dine", "dining", "restaurant", "cafe", "bar", "pub", "drink", "drinks", "takeaway"],
  "Beauty & Spa": ["beauty", "spa", "salon", "pamper", "pampering"],
  "Things To Do": ["activity", "activities", "experience", "fun", "attraction", "outing"],
  "Travel & Getaways": ["travel", "getaway", "accommodation", "stay", "hotel", "motel", "holiday", "bnb"],
  "Health & Fitness": ["fitness", "gym", "workout", "exercise", "health"],
  "Home & Car": ["home", "house", "car", "auto", "vehicle"],
};

/** Words that mean the same thing in a deal. */
const SAME_AS: Record<string, string[]> = {
  breakfast: ["brunch"],
  brunch: ["breakfast"],
  // A flat white deal is a coffee deal even if it never says "coffee".
  coffee: ["espresso", "flat white", "latte", "cappuccino", "mocha", "long black"],
};

/** The query as the words to look for; [] when nothing is left to narrow by. */
export function searchWords(query: string): string[] {
  let text = query;
  for (const [emoji, word] of Object.entries(EMOJI_WORDS)) text = text.split(emoji).join(` ${word} `);
  const folded = foldText(text);
  // Something typed, but no letters or digits at all (an emoji we don't
  // know, "!!!"): nothing matches, rather than everything.
  if (folded.trim() && !/[a-z0-9]/.test(folded)) return [NOTHING];
  return folded
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/'/g, ""))
    .filter((w) => w && !IGNORED.has(w));
}

/** Edit distance of at most one ("cofee" and "coffee"). */
function oneEditApart(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** "massages" also as "massage", "cafes" as "cafe", each with its synonyms. */
function forms(word: string): string[] {
  const base = word.length > 3 && word.endsWith("s") ? [word, word.slice(0, -1)] : [word];
  return base.flatMap((w) => [w, ...(SAME_AS[w] ?? [])]);
}

type Searchable = Pick<Deal, "name" | "description" | "categories"> &
  Partial<
    Pick<
      Deal,
      | "isFlash"
      | "terms"
      | "tags"
      | "customerInstructions"
      | "bookingRequirement"
      | "businessName"
      | "businessSuburb"
      | "businessCity"
      | "businessServiceArea"
      | "businessAddress"
      | "businessBio"
      | "businessAmenities"
      | "now"
      | "searchText"
    >
  >;

/** What each booking choice says on a deal, for "walk in" or "book". */
const BOOKING_WORDS: Record<string, string> = {
  required: "booking required book",
  recommended: "booking recommended book",
  not_required: "walk ins welcome walk-in no booking",
};

/** Longest search text kept per deal: the whole of a long write-up isn't
 *  needed to find it, and every card in a list carries this. */
const MAX_SEARCH_TEXT = 1500;

/**
 * Everything a customer can read about a deal, folded for matching: its
 * name, the whole description, conditions, tags, the business's note on
 * using it, booking, Flash or Everyday, price, and the business's name,
 * suburb, city, area covered, address, About text and features. Built from
 * the full deal on the server (lib/listingDeal.ts toCardDeal), because a
 * card in the browser carries a shortened description and none of the
 * rest; never the deal code or contact details.
 */
export function dealSearchText(deal: Searchable): string {
  return foldText(
    [
      deal.name,
      htmlToText(deal.description ?? ""),
      deal.terms,
      ...(deal.tags ?? []).map(dealTagLabel),
      deal.customerInstructions,
      deal.bookingRequirement ? BOOKING_WORDS[deal.bookingRequirement] : "",
      deal.isFlash === undefined ? "" : deal.isFlash ? "flash" : "everyday",
      typeof deal.now === "number" && deal.now > 0 ? `$${deal.now} ${deal.now}` : "",
      deal.businessName,
      deal.businessSuburb,
      deal.businessCity,
      deal.businessServiceArea,
      deal.businessAddress,
      deal.businessBio,
      ...(deal.businessAmenities ?? []),
      ...deal.categories,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " "),
  ).slice(0, MAX_SEARCH_TEXT);
}

/** Every word of the query found somewhere a customer can read about the
 *  deal (dealSearchText), or in its category's everyday words. */
export function dealMatchesSearch(deal: Searchable, words: string[]): boolean {
  if (words.length === 0) return true;
  const text = deal.searchText ?? dealSearchText(deal);
  const categoryWords = deal.categories.flatMap((c) => CATEGORY_WORDS[c] ?? []);
  let tokens: string[] | null = null;
  return words.every((word) => {
    if (forms(word).some((f) => text.includes(f) || categoryWords.includes(f))) return true;
    // A one-letter slip in a longer word (T252), checked only when there's
    // no exact match.
    if (word.length < 5) return false;
    tokens ??= [
      ...new Set(
        text
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length >= 4)
          .flatMap((t) => (t.endsWith("s") ? [t, t.slice(0, -1)] : [t])),
      ),
    ];
    if (tokens.some((t) => oneEditApart(word, t)) || categoryWords.some((c) => c.length >= 4 && oneEditApart(word, c))) return true;
    // A slip in a word with synonyms ("cofee" for coffee, a flat white).
    const meant = Object.keys(SAME_AS).find((k) => oneEditApart(word, k));
    return meant !== undefined && forms(meant).some((f) => text.includes(f));
  });
}
