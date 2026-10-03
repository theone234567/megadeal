import { dealDisplayStatus } from "./dealStatus";

/** The business portal's "My deals" filters: which current deals to show
 *  by status, and which deals (current and past) by type. */
export type DealStatusFilter = "all" | "Live" | "Scheduled" | "Pending Approval" | "Paused";
export type DealTypeFilter = "all" | "everyday" | "flash";

export const STATUS_FILTERS: DealStatusFilter[] = ["all", "Live", "Scheduled", "Pending Approval", "Paused"];
export const TYPE_FILTERS: DealTypeFilter[] = ["all", "everyday", "flash"];

type FilterableDeal = { status?: string | null; expiresAt?: string | null; firstPublishedAt?: string | null; isFlash?: boolean | null };

export function matchesType(deal: FilterableDeal, type: DealTypeFilter): boolean {
  return type === "all" || (type === "flash") === Boolean(deal.isFlash);
}

export function matchesStatus(deal: FilterableDeal, status: DealStatusFilter, now?: number): boolean {
  return status === "all" || dealDisplayStatus(deal, now) === status;
}

/** How many deals each status filter would show, within a type. */
export function statusCounts(
  deals: FilterableDeal[],
  type: DealTypeFilter,
  now?: number,
): Record<DealStatusFilter, number> {
  const ofType = deals.filter((d) => matchesType(d, type));
  return Object.fromEntries(
    STATUS_FILTERS.map((s) => [s, ofType.filter((d) => matchesStatus(d, s, now)).length]),
  ) as Record<DealStatusFilter, number>;
}

/** Reads saved filters (sessionStorage text), falling back to "all" for
 *  anything missing or unknown. */
export function parseSavedFilters(raw: string | null): { status: DealStatusFilter; type: DealTypeFilter } {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return {
      status: STATUS_FILTERS.includes(v?.status) ? v.status : "all",
      type: TYPE_FILTERS.includes(v?.type) ? v.type : "all",
    };
  } catch {
    return { status: "all", type: "all" };
  }
}
