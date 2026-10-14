import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { dealTagLabel } from "@/lib/dealTags";
import { dealVerification, nzShortDate } from "@/lib/dealVerification";
import type { Deal } from "@/lib/types";

/**
 * Who stands behind a deal and how fresh it is, in a small box under its
 * conditions: "Business verified", then "Checked by MegaDeal 20 Oct ·
 * Updated 21 Oct". The same facts as the deal's structured data and the
 * public feed (lib/dealVerification.ts). Nothing shown for a preview,
 * which has none of these facts yet.
 */
export function DealProvenance({ deal }: { deal: Deal }) {
  if (!deal.updatedAt) return null;
  const v = dealVerification(deal);
  const confirmedLast = Boolean(v.merchantConfirmedAt && v.merchantConfirmedAt === v.lastCheckedAt);
  const checked = nzShortDate(v.lastCheckedAt);
  const updated = nzShortDate(v.updatedAt);
  return (
    // Two short lines that wrap cleanly on a phone: who stands behind it,
    // then when it was checked and changed.
    <div className="mt-4 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600">
      <p className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
          <CheckIcon className="h-3.5 w-3.5 text-emerald-700" />
          {v.label}
        </span>
        <Link href="/help#deal-checks" prefetch={false} className="shrink-0 underline hover:text-slate-800">
          What this means
        </Link>
      </p>
      {(checked || updated) && (
        <p className="mt-1">
          {checked && (
            <span className="whitespace-nowrap">
              {confirmedLast ? "Confirmed by the business" : "Checked by MegaDeal"}{" "}
              <time dateTime={v.lastCheckedAt!}>{checked}</time>
            </span>
          )}
          {checked && updated && <span aria-hidden="true"> · </span>}
          {updated && (
            <span className="whitespace-nowrap">
              Updated <time dateTime={v.updatedAt!}>{updated}</time>
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/** The deal's tags (lib/dealTags.ts) as small labels. */
export function DealTags({ tags }: { tags: string[] | undefined }) {
  if (!tags?.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Good to know">
      {tags.map((t) => (
        <li key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {dealTagLabel(t)}
        </li>
      ))}
    </ul>
  );
}
