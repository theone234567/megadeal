/** "Reject" a deal (lib/dealReject.ts, SEO pack T242): the parts the admin
 *  page needs too, kept free of anything server-only. */

/** The reasons an admin can tick, as the business reads them. */
export const REJECT_PRESETS = [
  { id: "price", label: "The usual price or saving doesn't look right" },
  { id: "not-a-discount", label: "It isn't a real discount" },
  { id: "photo", label: "The photo isn't suitable" },
  { id: "conditions", label: "The conditions aren't clear" },
  { id: "alcohol", label: "It goes against our alcohol rules" },
  { id: "duplicate", label: "It duplicates another deal" },
  { id: "other", label: "Something else" },
] as const;

/** The written reason is required: it's what the business reads. */
export const MIN_REJECT_NOTE = 10;
export const MAX_REJECT_NOTE = 500;

/** The reason the business reads: the ticked reasons, then the note. */
export function rejectMessage(presets: string[], note: string): string {
  const labels = REJECT_PRESETS.filter((p) => p.id !== "other" && presets.includes(p.id)).map((p) => p.label);
  const tidy = note.trim().replace(/\s+/g, " ");
  return labels.length ? `${labels.join(". ")}. ${tidy}` : tidy;
}

/** The reason on a deal an admin rejected (its history), or null. */
export function rejectedReason(deal: Record<string, any> | null | undefined): string | null {
  if (deal?.status !== "Cancelled") return null;
  const history = Array.isArray(deal.contentHistory) ? deal.contentHistory : [];
  const last = history.find((h: { event?: string }) => h?.event === "rejected" || h?.event === "resubmitted" || h?.event === "sent-back");
  return last?.event === "rejected" && typeof last.reason === "string" ? last.reason : null;
}
