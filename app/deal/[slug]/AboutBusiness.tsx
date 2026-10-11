"use client";

import { useState } from "react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import type { DealAction } from "@/lib/dealEvents";
import { phoneLink } from "@/lib/booking";
import { safeWebHref } from "@/lib/socialLinks";
import { locationNotes, placeLabel } from "@/lib/location";
import { parseBusinessHours, formatBusinessHoursLines, hoursKnown, isOpenNow } from "@/lib/businessHours";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { ClockIcon, FacebookIcon, GlobeIcon, InstagramIcon, MapPinIcon, PhoneIcon } from "@/components/icons";

/** Past this, the description is cut to a few lines with "Read more". */
const BIO_PREVIEW = 420;

/**
 * "About [business]" on a deal page: enough to decide on the deal
 * (description, photos, where, when, links) without being a second copy
 * of the business profile, which is linked at the end.
 *
 * Server-rendered with the page, so the description is in the HTML for
 * search engines. Contact actions live in the Contact business pop-up;
 * the links here are the business's own site and socials, and its phone.
 * A hidden address shows only the suburb and city (lib/location.ts).
 */
export default function AboutBusiness({
  deal,
  preview,
  onAction,
}: {
  deal: Deal;
  preview: boolean;
  onAction: (action: DealAction) => void;
}) {
  const [bioOpen, setBioOpen] = useState(false);
  const name = deal.businessName ?? "";
  const bio = deal.businessBio?.trim() ?? "";
  const longBio = bio.length > BIO_PREVIEW;
  const photos = (deal.businessPhotos ?? []).slice(0, 6);
  const logo = deal.businessLogoUrl;

  const addressText = (deal.businessAddress ?? "").toLowerCase();
  const locationLine =
    [
      deal.businessAddress,
      deal.businessSuburb && !addressText.includes(deal.businessSuburb.toLowerCase()) ? deal.businessSuburb : null,
      deal.businessCity && !addressText.includes(deal.businessCity.toLowerCase()) ? deal.businessCity : null,
    ]
      .filter(Boolean)
      .join(", ") || placeLabel(deal.businessSuburb, deal.businessCity);
  const notes = locationNotes(deal.businessAddressHidden === true, deal.businessServiceArea);

  const parsedHours = deal.businessHours ? parseBusinessHours(deal.businessHours) : null;
  const hourLines = parsedHours ? formatBusinessHoursLines(parsedHours) : deal.businessHours ? [deal.businessHours] : [];
  // "Closed now" only when real hours say so, never because none were given.
  const openNow = parsedHours && hoursKnown(parsedHours) ? isOpenNow(parsedHours) : null;

  const phone = phoneLink(deal.businessPhone);
  const links = [
    { key: "website", href: safeWebHref(deal.businessWebsite), label: "Website", icon: <GlobeIcon className="h-4 w-4" />, action: "website" as const },
    { key: "instagram", href: safeWebHref(deal.businessInstagramUrl), label: "Instagram", icon: <InstagramIcon className="h-4 w-4" />, action: null },
    { key: "facebook", href: safeWebHref(deal.businessFacebookUrl), label: "Facebook", icon: <FacebookIcon className="h-4 w-4" />, action: null },
    { key: "phone", href: phone?.href ?? null, label: phone?.display ?? "", icon: <PhoneIcon className="h-4 w-4" />, action: "call" as const },
  ].filter((l): l is typeof l & { href: string } => Boolean(l.href));

  // Real fields only: the business's price range and the amenities it ticked.
  const tags = [deal.businessPriceRange, ...deal.businessAmenities].filter((t): t is string => Boolean(t));

  const hasDetails = Boolean(locationLine || hourLines.length > 0 || links.length > 0);
  if (!name || !(bio || photos.length > 0 || hasDetails || tags.length > 0)) return null;

  return (
    <section aria-labelledby="about-business" className="mt-10 rounded-[22px] bg-brand-50/70 p-5 sm:p-7 lg:mt-12 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wixImageUrl(logo, 160, 160)}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-1 ring-brand-100"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-display text-xl font-semibold text-brand-700 ring-1 ring-brand-100"
              >
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-700">About the business</p>
              <h2 id="about-business" className="font-display text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
                {name}
              </h2>
            </div>
          </div>

          {bio && (
            <div className="mt-4">
              <p
                id="business-bio"
                className={`max-w-[62ch] whitespace-pre-line text-[0.9375rem] leading-relaxed text-slate-700 ${
                  longBio && !bioOpen ? "line-clamp-4" : ""
                }`}
              >
                {bio}
              </p>
              {longBio && (
                <button
                  type="button"
                  aria-expanded={bioOpen}
                  aria-controls="business-bio"
                  onClick={() => setBioOpen((v) => !v)}
                  className="mt-1 text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
                >
                  {bioOpen ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="About this business">
              {tags.map((t) => (
                <li key={t} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-brand-100">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasDetails && (
          <div className="grid content-start gap-4 text-sm text-slate-700">
            {locationLine && (
              <div className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <div>
                  <p className="font-semibold text-slate-900">{locationLine}</p>
                  {notes.map((n) => (
                    <p key={n} className="mt-0.5 text-xs text-slate-600">
                      {n}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {hourLines.length > 0 && (
              <div className="flex items-start gap-2.5">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <div>
                  {/* The business's opening hours — not when this deal can
                      be used, which is in its conditions. */}
                  <p className="font-semibold text-slate-900">
                    Opening hours
                    {openNow !== null && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                          openNow ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "bg-white text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {openNow ? "Open now" : "Closed now"}
                      </span>
                    )}
                  </p>
                  {hourLines.map((line, i) => (
                    <p key={i} className="mt-0.5 tabular-nums">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {links.length > 0 && (
              <ul className="flex flex-wrap gap-x-5 gap-y-1 border-t border-brand-100 pt-3">
                {links.map((l) => (
                  <li key={l.key}>
                    {preview ? (
                      <span className="inline-flex min-h-10 items-center gap-1.5 font-bold text-brand-700">
                        {l.icon}
                        {l.label}
                      </span>
                    ) : (
                      <a
                        href={l.href}
                        onClick={l.action ? () => onAction(l.action!) : undefined}
                        {...(l.key === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer nofollow ugc" })}
                        aria-label={l.key === "phone" ? `Call ${name} on ${l.label}` : `${name} on ${l.label} (opens in a new tab)`}
                        className="inline-flex min-h-10 items-center gap-1.5 font-bold text-brand-700 underline-offset-2 hover:underline"
                      >
                        {l.icon}
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Business photos from its profile (lib/businessPhotos.ts): a row of
          three on wider screens, a swipe row on a phone. Never the deal
          photo again. */}
      {photos.length > 0 && (
        <ul
          aria-label={`Photos of ${name}`}
          className="-mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((url, i) => (
            <li
              key={url + i}
              className={`relative aspect-[4/3] w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white sm:w-auto ${
                i >= 3 ? "sm:hidden" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wixImageUrl(url, 640, 480)}
                srcSet={wixImageSrcSet(url, [480, 640], 4 / 3)}
                sizes="(min-width: 640px) 33vw, 78vw"
                alt={`${name}, photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      {deal.businessSlug && !preview && (
        <Link
          href={`/business/${deal.businessSlug}`}
          prefetch={false}
          className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
        >
          View full business profile <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
