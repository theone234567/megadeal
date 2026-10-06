import { placeLabel } from "./location";

/**
 * A deal page's search title. Search results show about 60 characters and
 * cut the rest, so the longest version that fits is used, dropping the
 * least useful part first: the city when the suburb is known, then the
 * price (the description has it), then the discount, then the place. The
 * deal's name and business always lead. Share previews, which show more,
 * keep the full version (`full`).
 *
 * Without the " | MegaDeal" the site adds (app/layout.tsx title.template).
 */
export const TITLE_MAX = 60;

export interface DealTitleInput {
  name: string;
  businessName: string | null;
  businessSuburb: string | null;
  businessCity: string | null;
  discountPercent: number;
  /** Already formatted, e.g. "$29". */
  price: string;
}

export function dealTitles(deal: DealTitleInput): { title: string; full: string } {
  const name = deal.name.trim();
  const business = (deal.businessName ?? "").trim();
  const place = placeLabel(deal.businessSuburb, deal.businessCity);
  // The suburb alone ("Takapuna"), or the city when that's all there is.
  const near = (deal.businessSuburb ?? "").trim() || place;
  const where = (p: string | null) => (business ? ` at ${business}${p ? `, ${p}` : ""}` : p ? ` in ${p}` : "");
  const off = deal.discountPercent > 0 ? `${deal.discountPercent}% off` : "";

  const full = `${name}${where(place)} — ${off ? `${off}, ` : ""}${deal.price}`;
  const ordered = [
    full,
    `${name}${where(near)} — ${off ? `${off}, ` : ""}${deal.price}`,
    ...(off ? [`${name}${where(near)} — ${off}`] : []),
    `${name}${where(near)}`,
  ];
  const title = ordered.find((t) => t.length <= TITLE_MAX) ?? `${name}${where(null)}`;
  return { title, full };
}
