import type { Deal } from "./types";

/**
 * What MegaDeal can truthfully say about where a deal came from and how
 * fresh it is, worked out from recorded facts only (no scores, nothing
 * guessed). Shown on the deal page and in the public feed, and the same
 * wording in both.
 *
 *  - "merchant-verified": the business claimed its MegaDeal account (its
 *    owner signs in) and MegaDeal approved the deal.
 *  - "megadeal-listed": MegaDeal approved the deal, but the business
 *    hasn't claimed its account yet (one brought over from the old site,
 *    or added by MegaDeal).
 *  - "community-submitted": a moderated suggestion from the public. Not
 *    used yet; here so the data can say so when it is.
 */
export type VerificationLevel = "merchant-verified" | "megadeal-listed" | "community-submitted";

export interface DealVerification {
  level: VerificationLevel;
  /** Short label, e.g. for a badge. */
  label: string;
  /** Who put the deal on MegaDeal. */
  source: "merchant" | "admin" | "community";
  businessClaimed: boolean;
  /** When MegaDeal last approved what the deal says (ISO), or null. */
  approvedAt: string | null;
  /** When the business last confirmed it's still running as listed. */
  merchantConfirmedAt: string | null;
  /** The later of the two: when someone last checked the deal. */
  lastCheckedAt: string | null;
  /** When anything a customer sees last changed. */
  updatedAt: string | null;
}

const LABEL: Record<VerificationLevel, string> = {
  "merchant-verified": "Business verified",
  "megadeal-listed": "Listed by MegaDeal",
  "community-submitted": "Community submitted, checked by MegaDeal",
};

const latest = (...isos: (string | null | undefined)[]): string | null => {
  let best: string | null = null;
  for (const iso of isos) {
    if (iso && !Number.isNaN(Date.parse(iso)) && (!best || Date.parse(iso) > Date.parse(best))) best = iso;
  }
  return best;
};

export function dealVerification(
  deal: Pick<Deal, "source" | "businessClaimed" | "approvedAt" | "merchantConfirmedAt" | "updatedAt">
): DealVerification {
  const source = deal.source ?? "merchant";
  const businessClaimed = deal.businessClaimed === true;
  const level: VerificationLevel =
    source === "community" ? "community-submitted" : businessClaimed ? "merchant-verified" : "megadeal-listed";
  return {
    level,
    label: LABEL[level],
    source,
    businessClaimed,
    approvedAt: deal.approvedAt ?? null,
    merchantConfirmedAt: deal.merchantConfirmedAt ?? null,
    lastCheckedAt: latest(deal.approvedAt, deal.merchantConfirmedAt),
    updatedAt: deal.updatedAt ?? null,
  };
}

/** "13 October 2026", as the date it is in New Zealand. */
export function nzLongDate(iso: string | null | undefined): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" });
}

/** "13 Oct", or "13 Oct 2025" when it isn't this year, as the date it is
 *  in New Zealand: short enough to sit on one line on a phone. */
export function nzShortDate(iso: string | null | undefined, now: number = Date.now()): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  const year = (t: number) => new Date(t).toLocaleDateString("en-NZ", { year: "numeric", timeZone: "Pacific/Auckland" });
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    ...(year(Date.parse(iso)) !== year(now) ? { year: "numeric" as const } : {}),
    timeZone: "Pacific/Auckland",
  });
}
