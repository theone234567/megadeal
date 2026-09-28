import type { DealStatus } from "./types";

/**
 * What a business sees a deal as. "Ended" isn't stored: a Live or Paused
 * deal whose run is over keeps its status in Wix, and is shown (and
 * treated) as ended from the moment its end time passes.
 */
export type DealDisplayStatus = DealStatus | "Ended";

export const DEAL_STATUS_STYLES: Record<DealDisplayStatus, string> = {
  Draft: "bg-brand-50 text-brand-700 border-brand-200",
  "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
  Live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Paused: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-600 border-red-200",
  Ended: "bg-slate-100 text-slate-700 border-slate-300",
};

/** A deal's status as the business sees it — "Ended" once a Live or
 *  Paused deal's run is over. (A deal with no status predates the field
 *  and counts as Live.) */
export function dealDisplayStatus(
  deal: { status?: DealStatus | string | null; expiresAt?: string | null },
  now: number = Date.now()
): DealDisplayStatus {
  const status = (deal.status || "Live") as DealStatus;
  if ((status === "Live" || status === "Paused") && hasDealExpired(deal.expiresAt, now)) return "Ended";
  return status;
}

/** Ended or cancelled: finished for good, kept as history. Either can be
 *  run again only as a new deal (duplicate), with a new run length. */
export function isPastDeal(deal: { status?: DealStatus | string | null; expiresAt?: string | null }, now?: number): boolean {
  const s = dealDisplayStatus(deal, now);
  return s === "Ended" || s === "Cancelled";
}

export interface DealStatusAction {
  label: string;
  target: DealStatus;
  danger?: boolean;
}

/**
 * What a business can do to a submitted deal from each status: pause,
 * resume, cancel or withdraw — never change its content, which only an
 * admin can do (customers may already hold a code for the offer as it
 * stands). Enforced server-side by /api/deals/[id]/status; the Deals
 * collection itself is admin-only in Wix. Approval ("Pending Approval" to
 * "Live") is always an admin action, never offered here.
 */
export function allowedDealActions(status: DealDisplayStatus | null): DealStatusAction[] {
  switch (status) {
    // Over for good — nothing to pause, resume or cancel.
    case "Ended":
      return [];
    case "Live":
      return [
        { label: "Pause", target: "Paused" },
        { label: "Cancel deal", target: "Cancelled", danger: true },
      ];
    case "Paused":
      return [
        { label: "Make live", target: "Live" },
        { label: "Cancel deal", target: "Cancelled", danger: true },
      ];
    case "Pending Approval":
      return [{ label: "Withdraw submission", target: "Cancelled", danger: true }];
    // A draft isn't in the workflow yet, so none of the pause/cancel
    // transitions apply. Its two actions — keep editing, or throw it away —
    // are not status changes and live on the card itself.
    case "Draft":
      return [];
    case "Cancelled":
      return [];
    case null:
    default:
      return [
        { label: "Pause", target: "Paused" },
        { label: "Cancel deal", target: "Cancelled", danger: true },
      ];
  }
}

/**
 * True if a deal's run has already ended — expiresAt is an absolute
 * deadline, set once at submission, and pausing never extends it. That's
 * unremarkable while a deal is Live, but it means resuming a Paused deal
 * (see app/api/deals/[id]/status/route.ts) is only meaningful if the
 * deadline hasn't already passed; otherwise "Make live" would flip the
 * status back while isDealLive keeps it off the storefront anyway, with
 * nothing telling the merchant why.
 */
export function hasDealExpired(expiresAt: string | null | undefined, now: number = Date.now()): boolean {
  return Boolean(expiresAt) && new Date(expiresAt as string).getTime() <= now;
}

/**
 * True when cancelling this deal should return the credit spent on it:
 * it is still awaiting approval, was never live (an admin can move a live
 * deal back to "Pending Approval"), and hasn't been refunded already.
 * Views or code reveals mean customers saw it, whatever its status says.
 */
export function withdrawalRefundsCredit(deal: Record<string, any>): boolean {
  return (
    deal.status === "Pending Approval" &&
    !deal.everLive &&
    !deal.creditRefunded &&
    !(Number(deal.viewCount) > 0) &&
    !(Number(deal.clickCount) > 0)
  );
}
