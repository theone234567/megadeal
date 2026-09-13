import type { DealStatus } from "./types";

export const DEAL_STATUS_STYLES: Record<DealStatus, string> = {
  Draft: "bg-brand-50 text-brand-700 border-brand-200",
  "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
  Live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Paused: "bg-slate-100 text-slate-600 border-slate-200",
  Cancelled: "bg-red-50 text-red-600 border-red-200",
};

export interface DealStatusAction {
  label: string;
  target: DealStatus;
  danger?: boolean;
}

/**
 * What a merchant is allowed to do from each status, enforced here in the
 * UI. Wix's SITE_MEMBER_AUTHOR permission guarantees a merchant can only
 * ever write to deals they themselves own — but it doesn't understand our
 * approval workflow, so going live from "Pending Approval" always stays a
 * site-owner action taken in the Wix dashboard, never a button shown here.
 */
export function allowedDealActions(status: DealStatus | null): DealStatusAction[] {
  switch (status) {
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
