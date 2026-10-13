import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { dealTagLabel } from "@/lib/dealTags";
import { dealVerification, nzLongDate } from "@/lib/dealVerification";
import type { Deal } from "@/lib/types";

/**
 * Who stands behind a deal and how fresh it is, in one plain line under
 * its conditions: "Business verified · Checked by MegaDeal 20 October 2026
 * · Updated 21 October 2026". The same facts as the deal's structured data
 * and the public feed (lib/dealVerification.ts). Nothing shown for a
 * preview, which has none of these facts yet.
 */
export function DealProvenance({ deal }: { deal: Deal }) {
  if (!deal.updatedAt) return null;
  const v = dealVerification(deal);
  const confirmedLast = Boolean(v.merchantConfirmedAt && v.merchantConfirmedAt === v.lastCheckedAt);
  const checked = nzLongDate(v.lastCheckedAt);
  const updated = nzLongDate(v.updatedAt);
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
        <CheckIcon className="h-3.5 w-3.5 text-emerald-700" />
        {v.label}
      </span>
      {checked && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {confirmedLast ? "Confirmed by the business" : "Checked by MegaDeal"}{" "}
            <time dateTime={v.lastCheckedAt!}>{checked}</time>
          </span>
        </>
      )}
      {updated && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Updated <time dateTime={v.updatedAt!}>{updated}</time>
          </span>
        </>
      )}
      <span aria-hidden="true">·</span>
      <Link href="/help#deal-checks" className="underline hover:text-slate-800">
        What this means
      </Link>
    </p>
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
