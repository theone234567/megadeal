import { bookingConflict, isBookingChoice } from "./booking";
import { dealCodeError, normaliseDealCode } from "./dealCode";

/**
 * Admin edits to a submitted deal's content. Businesses can't change a deal
 * once it's submitted (customers may already hold a code for it), so fixes
 * go through an admin — this validates them and keeps a record of what
 * each edit replaced.
 */

/** The deal fields an admin can edit, as stored on the Deals row. */
export const EDITABLE_DEAL_FIELDS = [
  "dealName",
  "description",
  "terms",
  "priceNow",
  "priceWas",
  "bookingRequirement",
  "quantityAvailable",
  "dealCode",
] as const;
export type EditableDealField = (typeof EDITABLE_DEAL_FIELDS)[number];

/** Fields the linked Wix Stores product also holds. The storefront reads
 *  the name and prices from the product, so edits must reach it; the
 *  description is kept in step so the two copies never disagree. */
export const PRODUCT_FIELDS: EditableDealField[] = ["dealName", "description", "priceNow", "priceWas"];

export interface DealHistoryEntry {
  at: string;
  /** The values the edit replaced (not the new ones — those are on the row). */
  previous: Record<string, unknown>;
}

const MAX_HISTORY = 25;

/**
 * Validates the content fields present in `body` against the existing row
 * and returns only the ones that actually change. Fields left out of the
 * body are untouched; nothing here is required.
 */
export function parseAdminContentEdit(
  body: Record<string, unknown>,
  existing: Record<string, any>
): { changes: Partial<Record<EditableDealField, unknown>>; error: string | null } {
  const next: Record<string, unknown> = {};

  if (body.dealName !== undefined) {
    const v = String(body.dealName).trim();
    // Wix Stores caps product names at 80 characters.
    if (!v || v.length > 80) return { changes: {}, error: "Deal name must be 1–80 characters." };
    next.dealName = v;
  }
  if (body.description !== undefined) {
    const v = String(body.description).trim();
    if (!v) return { changes: {}, error: "Description can't be empty." };
    next.description = v.slice(0, 5000);
  }
  if (body.terms !== undefined) {
    const v = String(body.terms).trim();
    if (!v) return { changes: {}, error: "Conditions can't be empty." };
    next.terms = v.slice(0, 2000);
  }
  if (body.priceNow !== undefined) {
    const v = Number(body.priceNow);
    if (!Number.isFinite(v) || v <= 0) return { changes: {}, error: "Price must be more than $0." };
    next.priceNow = Math.round(v * 100) / 100;
  }
  if (body.priceWas !== undefined) {
    // Empty means "no comparison price", stored the way the create route
    // stores it: equal to the deal price.
    const raw = body.priceWas;
    const v = raw === null || raw === "" ? null : Number(raw);
    if (v !== null && (!Number.isFinite(v) || v <= 0)) {
      return { changes: {}, error: "Usual price must be a number." };
    }
    next.priceWas = v === null ? null : Math.round(v * 100) / 100;
  }
  if (body.bookingRequirement !== undefined) {
    if (!isBookingChoice(body.bookingRequirement)) {
      return { changes: {}, error: "Choose whether customers need to book." };
    }
    next.bookingRequirement = body.bookingRequirement;
  }
  if (body.quantityAvailable !== undefined) {
    const raw = body.quantityAvailable;
    const v = raw === null || raw === "" ? null : Number(raw);
    if (v !== null && (!Number.isInteger(v) || v < 0)) {
      return { changes: {}, error: "Quantity must be a whole number (or empty for no limit)." };
    }
    next.quantityAvailable = v;
  }

  if (body.dealCode !== undefined) {
    const code = normaliseDealCode(body.dealCode);
    // Admins may set a MEGA- code (e.g. to restore a generated one).
    const codeError = code ? dealCodeError(code, { allowReserved: true }) : "The deal code can't be empty.";
    if (codeError) return { changes: {}, error: `Deal code: ${codeError}` };
    next.dealCode = code;
  }

  // Nothing to check when the request isn't a content edit (a status or
  // expiry save) — stored values it doesn't touch mustn't block it.
  if (Object.keys(next).length === 0) return { changes: {}, error: null };

  // Cross-field checks run against the result of the edit, not the parts.
  // A deal with no comparison price stores priceWas equal to priceNow (as
  // the create route does), so that has to hold after a price change too.
  const oldNow = Number(existing.priceNow);
  const oldWas = Number(existing.priceWas ?? oldNow);
  const priceNow = (next.priceNow ?? oldNow) as number;
  if (next.priceWas === null) {
    next.priceWas = priceNow;
  } else if (next.priceWas === undefined && next.priceNow !== undefined && oldWas === oldNow) {
    next.priceWas = priceNow;
  }
  const priceWas = (next.priceWas ?? oldWas) as number;
  if (priceWas < priceNow) {
    return { changes: {}, error: "The usual price can't be lower than the deal price." };
  }
  const conflict = bookingConflict(next.bookingRequirement ?? existing.bookingRequirement, (next.terms ?? existing.terms) as string);
  if (conflict) return { changes: {}, error: conflict };

  const changes: Partial<Record<EditableDealField, unknown>> = {};
  for (const field of EDITABLE_DEAL_FIELDS) {
    if (field in next && next[field] !== (existing[field] ?? null)) changes[field] = next[field];
  }
  return { changes, error: null };
}

/** Prepends what an edit replaced to the row's history, newest first. */
export function withHistory(
  existing: Record<string, any>,
  fields: string[],
  at: string = new Date().toISOString()
): DealHistoryEntry[] {
  const previous: Record<string, unknown> = {};
  for (const f of fields) previous[f] = existing[f] ?? null;
  const prior = Array.isArray(existing.contentHistory) ? existing.contentHistory : [];
  return [{ at, previous }, ...prior].slice(0, MAX_HISTORY);
}

/** The storefront shows descriptions as text; Wix stores them as HTML. */
export function textToHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escape(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Builds the Update Product body for a single-variant deal product from
 * the product as just read (its revision and variant ids are required).
 * Returns null when nothing on the product changes.
 */
export function buildProductUpdate(
  product: any,
  changes: Partial<Record<EditableDealField, unknown>>,
  final: { priceNow: number; priceWas: number }
): Record<string, unknown> | null {
  const update: Record<string, any> = { id: product.id, revision: product.revision };
  let touched = false;
  if (changes.dealName !== undefined) {
    update.name = changes.dealName;
    touched = true;
  }
  if (changes.description !== undefined) {
    update.plainDescription = textToHtml(String(changes.description));
    touched = true;
  }
  if (changes.priceNow !== undefined || changes.priceWas !== undefined) {
    const variants = product?.variantsInfo?.variants ?? [];
    // Every MegaDeal product is created with exactly one variant and no
    // options. Anything else was edited by hand in Wix, and rewriting its
    // variants from here could drop them.
    if (variants.length !== 1 || (product.options ?? []).length > 0) {
      throw new Error("This deal's Wix product has options or several variants — change its price in the Wix dashboard.");
    }
    const v = variants[0];
    // Variants and options must be sent together, and the variant array
    // is replaced wholesale, so the one variant goes back with its id.
    update.options = product.options ?? [];
    update.variantsInfo = {
      variants: [
        {
          id: v.id,
          choices: v.choices ?? [],
          price: {
            actualPrice: { amount: String(final.priceNow) },
            compareAtPrice: { amount: String(final.priceWas) },
          },
        },
      ],
    };
    touched = true;
  }
  return touched ? { product: update } : null;
}
