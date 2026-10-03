/**
 * What a customer did with a deal, as counted for the business: each
 * action on "Get this deal" separately, plus one "interest" per visit
 * (clickCount, the original counter — withdrawal refunds also read it).
 * Interest, never a sale, booking or redemption.
 */
export const DEAL_ACTIONS = ["copy", "website", "call", "email", "directions"] as const;
export type DealAction = (typeof DEAL_ACTIONS)[number];
export type DealEvent = "view" | "click" | DealAction;

/** The Deals field each event adds to. */
export const DEAL_EVENT_FIELD: Record<DealEvent, string> = {
  view: "viewCount",
  click: "clickCount",
  copy: "codeCopyCount",
  website: "websiteClickCount",
  call: "callClickCount",
  email: "emailClickCount",
  directions: "directionsClickCount",
};

export function isDealEvent(v: unknown): v is DealEvent {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(DEAL_EVENT_FIELD, v);
}

/** Labels for the business: what each number counts. */
export const DEAL_ACTION_LABELS: Record<DealAction, { one: string; many: string }> = {
  copy: { one: "code copied or shown", many: "codes copied or shown" },
  website: { one: "website / booking click", many: "website / booking clicks" },
  call: { one: "call tap", many: "call taps" },
  email: { one: "email tap", many: "email taps" },
  directions: { one: "directions tap", many: "directions taps" },
};

/** The non-zero action counts on a deal row, in a fixed order. */
export function dealActionCounts(deal: Record<string, unknown>): { action: DealAction; count: number; label: string }[] {
  return DEAL_ACTIONS.map((action) => {
    const n = Number(deal[DEAL_EVENT_FIELD[action]]);
    const count = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    const l = DEAL_ACTION_LABELS[action];
    return { action, count, label: `${count} ${count === 1 ? l.one : l.many}` };
  }).filter((a) => a.count > 0);
}
