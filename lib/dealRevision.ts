import { dealDisplayStatus } from "./dealStatus";
import { EDITABLE_DEAL_FIELDS, parseAdminContentEdit, type EditableDealField } from "./dealAdminEdit";

/**
 * Change requests for a submitted deal (handoff pack, FINAL-SPEC §7: edits
 * to a live offer are a revision, and the original stays up until it's
 * approved). A business proposes new values; they wait on the Deals row as
 * `pendingRevision` while customers keep seeing the deal as it was; an
 * admin approves (applied through the same path as an admin edit, with
 * history) or declines with a note. Same pattern as a replacement photo
 * (`pendingPhotoUrl`).
 *
 * The deal code is never part of a request: customers may already hold
 * the code as it stands.
 */

export const REVISABLE_FIELDS = EDITABLE_DEAL_FIELDS.filter((f) => f !== "dealCode") as Exclude<EditableDealField, "dealCode">[];

export const REVISION_FIELD_LABELS: Record<(typeof REVISABLE_FIELDS)[number], string> = {
  dealName: "Deal name",
  description: "Description",
  terms: "Conditions",
  priceNow: "Deal price",
  priceWas: "Usual price",
  bookingRequirement: "Booking",
  quantityAvailable: "Quantity",
};

export interface DealRevision {
  changes: Partial<Record<(typeof REVISABLE_FIELDS)[number], unknown>>;
  /** The business's note to the reviewer, if any. */
  note: string;
  submittedAt: string;
}

/** A deal that's been submitted and hasn't finished: pending, live,
 *  scheduled or paused. Drafts are edited directly; ended and cancelled
 *  deals are run again as new ones. */
export function canRequestRevision(deal: Record<string, any>, now?: number): boolean {
  const s = dealDisplayStatus(deal, now);
  return s === "Pending Approval" || s === "Live" || s === "Scheduled" || s === "Paused";
}

/**
 * Checks a business's proposed changes against the deal as it stands, with
 * the admin edit rules (lib/dealAdminEdit.ts). Only fields that actually
 * change are kept; anything not in REVISABLE_FIELDS is ignored.
 */
export function parseRevisionRequest(
  body: Record<string, unknown>,
  existing: Record<string, any>
): { revision?: DealRevision; error?: string } {
  const proposed: Record<string, unknown> = {};
  const src = (body?.changes && typeof body.changes === "object" ? body.changes : {}) as Record<string, unknown>;
  for (const f of REVISABLE_FIELDS) if (src[f] !== undefined) proposed[f] = src[f];
  const { changes, error } = parseAdminContentEdit(proposed, existing);
  if (error) return { error };
  if (Object.keys(changes).length === 0) return { error: "Nothing has changed from the deal as it is now." };
  return {
    revision: {
      changes: changes as DealRevision["changes"],
      note: typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "",
      submittedAt: new Date().toISOString(),
    },
  };
}

/** Reads a stored request back (JSON text, or an object), or null. */
export function readRevision(row: Record<string, any> | null | undefined): DealRevision | null {
  const raw = row?.pendingRevision;
  if (!raw) return null;
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!v || typeof v !== "object" || !v.changes || typeof v.changes !== "object") return null;
    const changes: DealRevision["changes"] = {};
    for (const f of REVISABLE_FIELDS) if (f in v.changes) changes[f] = v.changes[f];
    if (Object.keys(changes).length === 0) return null;
    return { changes, note: typeof v.note === "string" ? v.note : "", submittedAt: typeof v.submittedAt === "string" ? v.submittedAt : "" };
  } catch {
    return null;
  }
}

function show(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return field === "quantityAvailable" ? "No limit" : "—";
  if (field === "priceNow" || field === "priceWas") return `$${v}`;
  if (field === "bookingRequirement") {
    return v === "required" ? "Booking required" : v === "recommended" ? "Booking recommended" : v === "not_required" ? "No booking needed" : String(v);
  }
  return String(v);
}

/** "Deal price: $49 → $45" lines, for the business and the reviewer. */
export function revisionLines(revision: DealRevision, existing: Record<string, any>): { label: string; from: string; to: string }[] {
  return REVISABLE_FIELDS.filter((f) => f in revision.changes).map((f) => ({
    label: REVISION_FIELD_LABELS[f],
    from: show(f, existing[f]),
    to: show(f, revision.changes[f]),
  }));
}
