"use client";

import Link from "next/link";
import { useUrlSearch } from "@/lib/useUrlSearch";

/**
 * "← Back to deal" on a business profile opened from one of its deals
 * (the deal page links here with ?from=<deal>). Only ever a link to one of
 * this business's own live deals, checked against the list the page
 * passes in, never to an address taken from the URL. When the deal page
 * is the previous page in this tab, it goes back in history, so the deal
 * page comes back where the visitor left it.
 *
 */
export default function BackToDeal({ deals }: { deals: { slug: string; name: string }[] }) {
  // Empty on the server, so the cached page is the same for everyone.
  const from = useUrlSearch().get("from");
  const deal = from ? deals.find((d) => d.slug === from) : undefined;
  if (!deal) return null;
  const href = `/deal/${deal.slug}`;
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        let cameFromDeal = false;
        try {
          cameFromDeal = Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin && new URL(document.referrer).pathname === href;
        } catch {}
        if (cameFromDeal && window.history.length > 1 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          window.history.back();
        }
      }}
      className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
    >
      <span aria-hidden="true">←</span> Back to deal<span className="sr-only">: {deal.name}</span>
    </Link>
  );
}
