import { rejectedReason } from "./dealRejectRules";

/** Admin > Deals: which deals to list (T242 adds Rejected, told apart
 *  from Cancelled by its "rejected" history entry, lib/dealReject.ts). */
export const DEAL_STATUS_FILTERS = [
  { id: "all", label: "All deals" },
  { id: "pending", label: "Waiting for review" },
  { id: "live", label: "Live" },
  { id: "autoposted", label: "Auto-posted by AI" },
  { id: "paused", label: "Paused" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled (not rejected)" },
] as const;

export type DealStatusFilter = (typeof DEAL_STATUS_FILTERS)[number]["id"];

export function matchesDealStatusFilter(deal: Record<string, any>, filter: DealStatusFilter): boolean {
  const status = deal.status || "Live";
  switch (filter) {
    case "all":
      return true;
    case "pending":
      return status === "Pending Approval";
    case "live":
      return status === "Live";
    case "autoposted":
      // Put live by the automatic check, not a person (T207).
      return deal.aiReview?.autoPosted === true && (status === "Live" || status === "Paused");
    case "paused":
      return status === "Paused";
    case "rejected":
      return rejectedReason(deal) !== null;
    case "cancelled":
      return status === "Cancelled" && rejectedReason(deal) === null;
  }
}
