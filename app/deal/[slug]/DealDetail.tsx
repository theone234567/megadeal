"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDealBySlug } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { boughtToday, dealEndsAt } from "@/lib/socialProof";
import CountdownBadge from "@/components/CountdownBadge";

export default function DealDetail({ slug }: { slug: string }) {
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDealBySlug(getPublicWixClient(), slug).then((result) => {
      if (!cancelled) setDeal(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (deal === undefined) {
    return (
      <main className="mx-auto max-w-5xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="aspect-[16/9] w-full rounded-2xl bg-slate-200" />
        <div className="mt-6 h-8 w-2/3 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
      </main>
    );
  }

  if (deal === null) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-slate-700">
          We couldn&apos;t find that deal.
        </p>
        <Link href="/" className="mt-4 inline-block text-brand-600 hover:underline">
          ← Back to all deals
        </Link>
      </main>
    );
  }

  const hasContactInfo = Boolean(deal.businessWebsite || deal.businessPhone || deal.businessAddress);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to all deals
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
            {deal.image ? (
              <Image
                src={deal.image}
                alt={deal.name}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-slate-300">
                🏷️
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <CountdownBadge
                target={deal.expiresAt ? new Date(deal.expiresAt) : dealEndsAt(deal.id)}
              />
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900">The fine print</h2>
            <div
              className="max-w-none space-y-3 text-sm leading-relaxed text-slate-600 [&_b]:font-semibold [&_b]:text-slate-800"
              dangerouslySetInnerHTML={{ __html: deal.description }}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            {deal.categories[0] && (
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {deal.categories[0]}
              </span>
            )}
            <h1 className="mt-1 text-2xl font-extrabold leading-snug text-slate-900">
              {deal.name}
            </h1>
            {deal.businessName && (
              <Link
                href={deal.businessSlug ? `/business/${deal.businessSlug}` : "#"}
                className="mt-2 flex items-center gap-2 group/business"
              >
                {deal.businessLogoUrl ? (
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <Image
                      src={deal.businessLogoUrl}
                      alt={deal.businessName}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span aria-hidden className="text-lg">
                    🏪
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-700 group-hover/business:text-brand-700 group-hover/business:underline">
                  by {deal.businessName}
                </span>
              </Link>
            )}
            <p className="mt-1 text-sm text-slate-400">
              {boughtToday(deal.id)} people have grabbed this deal today
            </p>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatMoney(deal.now, deal.currency, deal.formattedNow)}
              </span>
              {deal.was > deal.now && (
                <>
                  <span className="text-lg text-slate-400 line-through">
                    {formatMoney(deal.was, deal.currency, deal.formattedWas)}
                  </span>
                  <span className="rounded-full bg-ember-50 px-2 py-0.5 text-sm font-bold text-ember-600">
                    {deal.discountPercent}% off
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Price paid directly to {deal.businessName || "the business"} — MegaDeal
              doesn&apos;t process any payment.
            </p>

            <div className="mt-6">
              {!showContact ? (
                <button
                  onClick={() => setShowContact(true)}
                  className="w-full rounded-full bg-ember-500 py-3 text-center font-bold text-white shadow-card transition hover:bg-ember-600"
                >
                  Get this deal
                </button>
              ) : hasContactInfo ? (
                <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">
                    Contact or visit {deal.businessName || "the business"} and mention
                    this MegaDeal offer:
                  </p>
                  {deal.businessPhone && (
                    <a
                      href={`tel:${deal.businessPhone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      📞 {deal.businessPhone}
                    </a>
                  )}
                  {deal.businessWebsite && (
                    <a
                      href={
                        deal.businessWebsite.startsWith("http")
                          ? deal.businessWebsite
                          : `https://${deal.businessWebsite}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      🌐 Visit website
                    </a>
                  )}
                  {deal.businessAddress && (
                    <p className="flex items-center gap-2 text-sm text-brand-700">
                      📍 {deal.businessAddress}
                      {deal.businessCity ? `, ${deal.businessCity}` : ""}
                    </p>
                  )}
                  {deal.businessSlug && (
                    <Link
                      href={`/business/${deal.businessSlug}`}
                      className="inline-block text-xs font-semibold text-brand-600 hover:underline"
                    >
                      View full business profile →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">
                    Mention this MegaDeal offer when you contact or visit{" "}
                    {deal.businessName || "the business"} to redeem it.
                  </p>
                  {deal.businessSlug && (
                    <Link
                      href={`/business/${deal.businessSlug}`}
                      className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
                    >
                      View full business profile →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
