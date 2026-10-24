/** "Send back for changes" (lib/dealSendBack.ts): the parts the admin
 *  page needs too, kept free of anything server-only. */

/** What an admin can tick, in words the business reads ("Please change
 *  the photo"). "other" leaves it to the note. */
export const SEND_BACK_PRESETS = [
  { id: "photo", label: "the photo" },
  { id: "wording", label: "the wording" },
  { id: "price", label: "the price or conditions" },
  { id: "policy", label: "something our rules don't allow" },
  { id: "other", label: "something else" },
] as const;
export type SendBackPreset = (typeof SEND_BACK_PRESETS)[number]["id"];

export const MIN_SEND_BACK_NOTE = 5;
export const MAX_SEND_BACK_NOTE = 500;

/** After this many rounds, a resubmitted deal waits for a person instead
 *  of the automatic check deciding it again. */
export const ROUNDS_BEFORE_A_PERSON = 3;

/** The note the business reads: the ticked reasons, then the note. */
export function sendBackMessage(presets: string[], note: string): string {
  const labels = SEND_BACK_PRESETS.filter((p) => p.id !== "other" && presets.includes(p.id)).map((p) => p.label);
  const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0];
  const tidy = note.trim().replace(/\s+/g, " ");
  return list ? `Please change ${list}. ${tidy}` : tidy;
}

/** How many times a deal has been sent back for changes (its history,
 *  lib/dealSendBack.ts). */
export function sendBackRounds(deal: Record<string, any>): number {
  const history = Array.isArray(deal.contentHistory) ? deal.contentHistory : [];
  return history.filter((h: { event?: string }) => h?.event === "sent-back").length;
}
