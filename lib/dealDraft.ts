/**
 * A deal the merchant hasn't submitted yet.
 *
 * Drafts used to live in localStorage, which meant one draft per browser
 * (a second overwrote the first), nothing on any other device, everything
 * gone when site data was cleared, and no photo at all — a File can't be
 * serialised. Pre-launch that was the whole promise to a founding
 * merchant, "build it now and we'll publish on launch day", backed by a
 * browser cache.
 *
 * A draft is now an ordinary Deals row with status "Draft" and no
 * productId. Two consequences worth stating: it costs no credit until
 * submitted, and it cannot appear on the storefront, because every public
 * read starts from a Wix Stores product and joins Deals by productId —
 * a draft has no product, so there is nothing to join to.
 *
 * Category and the duration choice have no column on Deals (category
 * belongs to the product, duration is only used to compute expiresAt at
 * submission), so the full editing state is kept as JSON in `draftData`
 * alongside the few real columns the portal needs to list a draft without
 * parsing it.
 */
export interface DealDraftData {
  dealName: string;
  category: string;
  description: string;
  /** The rendered terms string, kept so a draft can be read without
   *  re-rendering it — the deal record and the public page use this. */
  terms: string;
  /** Which standard conditions were ticked, so reopening a draft restores
   *  the boxes rather than dumping the rendered sentence into free text. */
  selectedTerms: string[];
  customTerms: string;
  priceNow: string;
  priceWas: string;
  durationDays: number;
  isFlash: boolean;
  durationMinutes: number;
  quantityAvailable: string;
  /** Wix Media URL, not a data URL — the photo is uploaded when the draft
   *  is saved, so unlike the old local drafts it survives a restore. */
  photoUrl: string;
  photoMediaId: string;
}

export const EMPTY_DRAFT: DealDraftData = {
  dealName: "",
  category: "",
  description: "",
  terms: "",
  selectedTerms: [],
  customTerms: "",
  priceNow: "",
  priceWas: "",
  durationDays: 30,
  isFlash: false,
  durationMinutes: 60,
  quantityAvailable: "",
  photoUrl: "",
  photoMediaId: "",
};

/** Matches the maxLength on the matching textareas, so the form stops
 *  accepting characters at the same point this would quietly drop them. */
export const MAX_DRAFT_TEXT = 2000;
const MAX_TEXT = MAX_DRAFT_TEXT;

function text(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function positiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Coerces whatever the client sent into a draft.
 *
 * Deliberately lenient, unlike /api/deals/create. A draft is unfinished
 * work by definition — refusing to save one because the price is still
 * blank would defeat the point of having drafts at all. Everything is
 * validated properly at submission, which is the only moment it matters.
 */
export function sanitizeDraft(input: any): DealDraftData {
  return {
    dealName: text(input?.dealName, 200),
    category: text(input?.category, 100),
    description: text(input?.description),
    terms: text(input?.terms),
    selectedTerms: Array.isArray(input?.selectedTerms)
      ? input.selectedTerms.filter((id: unknown) => typeof id === "string").slice(0, 40)
      : [],
    customTerms: text(input?.customTerms),
    priceNow: text(input?.priceNow, 20),
    priceWas: text(input?.priceWas, 20),
    durationDays: positiveInt(input?.durationDays, 30),
    isFlash: Boolean(input?.isFlash),
    durationMinutes: positiveInt(input?.durationMinutes, 60),
    quantityAvailable: text(input?.quantityAvailable, 20),
    photoUrl: text(input?.photoUrl, 500),
    photoMediaId: text(input?.photoMediaId, 200),
  };
}

/** Reads a draft back off a Deals row, falling back to the row's own
 *  columns so a draft is still usable if draftData is ever missing. */
export function parseDraft(row: any): DealDraftData {
  let stored: any = {};
  try {
    stored = row?.draftData ? JSON.parse(row.draftData) : {};
  } catch {
    stored = {};
  }
  // Every column the draft route also writes gets a fallback, not just
  // the two the portal list happens to show. If draftData is ever missing
  // or unparseable, the recoverable text is what's left of the draft —
  // blanking it on screen would mean the next "Save changes" writes those
  // blanks over the only surviving copy.
  return sanitizeDraft({
    ...stored,
    dealName: stored.dealName || row?.dealName || "",
    description: stored.description || row?.description || "",
    terms: stored.terms || row?.terms || "",
    customTerms: stored.customTerms || (stored.terms ? "" : row?.terms || ""),
    photoUrl: stored.photoUrl || row?.photoUrl || "",
  });
}
