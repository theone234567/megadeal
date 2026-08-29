"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPublicWixClient } from "@/lib/wixClient";
import { fetchDealBySlug, fetchDeals } from "@/lib/fetchDeals";
import type { Deal } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { dealEndsAt } from "@/lib/socialProof";
import { getMapUrl, getDirectionsUrl } from "@/lib/mapLinks";
import CountdownBadge from "@/components/CountdownBadge";
import DealGrid from "@/components/DealGrid";
import ShareButtons from "@/components/ShareButtons";
import { PhoneIcon, MailIcon, GlobeIcon, MapPinIcon, ClockIcon, CalendarIcon } from "@/components/icons";
import { trackDealEvent } from "@/lib/trackDeal";
import StarRating from "@/components/StarRating";

export default function DealDetail({ slug }: { slug: string }) {
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [showContact, setShowContact] = useState(false);
  const [related, setRelated] = useState<Deal[] | null>(null);

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

  useEffect(() => {
    if (deal?.id) trackDealEvent(deal.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  useEffect(() => {
    if (!deal) {
      setRelated(null);
      return;
    }
    let cancelled = false;
    fetchDeals(getPublicWixClient())
      .then((all) => {
        if (cancelled) return;
        const others = all.filter((d) => d.id !== deal.id);
        const sameCategory = others.filter((d) =>
          d.categories.some((c) => deal.categories.includes(c))
        );
        const pool = sameCategory.length > 0 ? sameCategory : others;
        setRelated(pool.slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  if (deal === undefined) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-shimmer aspect-[16/9] w-full rounded-2xl" />
        <div className="animate-shimmer mt-6 h-8 w-2/3 rounded" />
        <div className="animate-shimmer mt-3 h-4 w-1/3 rounded" />
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

  const hasContactInfo = Boolean(
    deal.businessWebsite ||
      deal.businessPhone ||
      deal.businessAddress ||
      deal.businessBookingUrl ||
      deal.businessBookingEmail
  );
  const hasAboutContent = Boolean(
    deal.businessBio ||
      deal.businessHours ||
      deal.businessPriceRange ||
      deal.businessAmenities.length > 0 ||
      deal.businessFacebookUrl ||
      deal.businessInstagramUrl
  );
  const mapUrl = getMapUrl({
    lat: deal.businessLat,
    lng: deal.businessLng,
    address: deal.businessAddress,
    city: deal.businessCity,
  });
  const directionsUrl = getDirectionsUrl({
    lat: deal.businessLat,
    lng: deal.businessLng,
    address: deal.businessAddress,
    city: deal.businessCity,
  });

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
            <p className="max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {deal.description}
            </p>
          </div>

          {deal.businessName && (hasAboutContent || hasContactInfo) && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h2 className="mb-2 text-lg font-bold text-slate-900">
                About {deal.businessName}
              </h2>
              {deal.businessPriceRange && (
                <p className="mb-2 text-sm font-semibold text-slate-600">
                  {deal.businessPriceRange}
                </p>
              )}
              {deal.businessBio && (
                <p className="text-sm leading-relaxed text-slate-600">{deal.businessBio}</p>
              )}
              {deal.businessAmenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {deal.businessAmenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {deal.businessHours && (
                <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                  <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" /> <span>{deal.businessHours}</span>
                </p>
              )}

              {hasContactInfo && (
                <div className="mt-3 space-y-2">
                  {deal.businessBookingUrl && (
                    <a
                      href={
                        deal.businessBookingUrl.startsWith("http")
                          ? deal.businessBookingUrl
                          : `https://${deal.businessBookingUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95"
                    >
                      <CalendarIcon className="h-4 w-4" /> Book now
                    </a>
                  )}
                  {deal.businessPhone && (
                    <a
                      href={`tel:${deal.businessPhone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <PhoneIcon className="h-4 w-4 shrink-0" /> {deal.businessPhone}
                    </a>
                  )}
                  {deal.businessBookingEmail && (
                    <a
                      href={`mailto:${deal.businessBookingEmail}`}
                      className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <MailIcon className="h-4 w-4 shrink-0" /> {deal.businessBookingEmail}
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
                      <GlobeIcon className="h-4 w-4 shrink-0" /> Visit website
                    </a>
                  )}
                  {deal.businessAddress && (
                    <div className="text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 shrink-0" /> {deal.businessAddress}
                        {deal.businessCity ? `, ${deal.businessCity}` : ""}
                      </p>
                      {(mapUrl || directionsUrl) && (
                        <p className="mt-1 flex items-center gap-3 pl-6 text-xs font-semibold text-brand-700">
                          {mapUrl && (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              View map
                            </a>
                          )}
                          {directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Get directions
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(deal.businessFacebookUrl || deal.businessInstagramUrl) && (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  {deal.businessFacebookUrl && (
                    <a
                      href={deal.businessFacebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Facebook
                    </a>
                  )}
                  {deal.businessInstagramUrl && (
                    <a
                      href={deal.businessInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
              {deal.businessSlug && (
                <Link
                  href={`/business/${deal.businessSlug}`}
                  className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline"
                >
                  View full business profile →
                </Link>
              )}
            </div>
          )}
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
            <StarRating rating={deal.businessRating} reviewCount={deal.businessReviewCount} className="mt-1" />

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
              {deal.inStock &&
                deal.quantityAvailable !== null &&
                deal.quantityAvailable > 0 &&
                deal.quantityAvailable <= 5 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-sm font-bold text-red-600">
                    Only {deal.quantityAvailable} left
                  </span>
                )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Price paid directly to {deal.businessName || "the business"} — MegaDeal
              doesn&apos;t process any payment.
            </p>

            <ShareButtons title={deal.name} size="md" className="mt-4" />

            <div className="mt-6">
              {!deal.inStock ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-bold text-slate-500">
                  Sold out — check back soon
                </div>
              ) : !showContact ? (
                <button
                  onClick={() => {
                    trackDealEvent(deal.id, "click");
                    setShowContact(true);
                  }}
                  className="w-full rounded-full bg-ember-500 py-3 text-center font-bold text-white shadow-card transition hover:bg-ember-600 active:scale-95"
                >
                  Get this deal
                </button>
              ) : (
                <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">
                    Mention this MegaDeal offer when you contact or visit{" "}
                    {deal.businessName || "the business"} to redeem it.
                  </p>
                  {hasContactInfo && (
                    <p className="mt-1 text-xs text-brand-700">
                      Full contact details are in the &quot;About{" "}
                      {deal.businessName || "this business"}&quot; section below.
                    </p>
                  )}
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

      {related && related.length > 0 && (
        <div className="mt-10 border-t border-slate-100 pt-8">
          <h2 className="mb-5 text-xl font-bold text-slate-900">You might also like</h2>
          <DealGrid deals={related} />
        </div>
      )}
    </main>
  );
}
