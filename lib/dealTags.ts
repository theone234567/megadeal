/**
 * The fixed list of deal tags (deals.tags): picked by the business,
 * checked by MegaDeal when it approves the deal. Never free text, so a tag
 * means the same thing on every deal and in the public feed
 * (/feed/deals.json) — "kids", never also "kid friendly" or "children".
 *
 * Adding one is safe; renaming or removing one changes what existing deals
 * say, so it needs their tags moving too.
 */
export const DEAL_TAGS = [
  { id: "date-night", label: "Date night" },
  { id: "family-friendly", label: "Family friendly" },
  { id: "kids", label: "Great for kids" },
  { id: "groups", label: "Good for groups" },
  { id: "new-customers-only", label: "New customers only" },
  { id: "weekdays-only", label: "Weekdays only" },
  { id: "weekends", label: "Available weekends" },
  { id: "evenings", label: "Available evenings" },
  { id: "walk-ins-welcome", label: "Walk-ins welcome" },
  { id: "vegetarian-options", label: "Vegetarian options" },
  { id: "vegan-options", label: "Vegan options" },
  { id: "gluten-free-options", label: "Gluten-free options" },
  { id: "outdoors", label: "Outdoors" },
  { id: "wheelchair-accessible", label: "Wheelchair accessible" },
  { id: "dog-friendly", label: "Dog friendly" },
] as const;

export type DealTag = (typeof DEAL_TAGS)[number]["id"];

/** At most this many on one deal (the database allows 8). */
export const MAX_DEAL_TAGS = 5;

const LABEL = new Map<string, string>(DEAL_TAGS.map((t) => [t.id, t.label]));

export const isDealTag = (value: unknown): value is DealTag => typeof value === "string" && LABEL.has(value);

export const dealTagLabel = (id: string): string => LABEL.get(id) ?? id;

/** Known tags only, each once, in the list's order, at most MAX_DEAL_TAGS. */
export function cleanDealTags(value: unknown): DealTag[] {
  const given = new Set(Array.isArray(value) ? value.filter(isDealTag) : []);
  return DEAL_TAGS.map((t) => t.id).filter((id) => given.has(id)).slice(0, MAX_DEAL_TAGS);
}
