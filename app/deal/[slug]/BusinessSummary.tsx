"use client";

import Link from "next/link";
import type { Deal } from "@/lib/types";
import { safeWebHref } from "@/lib/socialLinks";
import { wixImageUrl } from "@/lib/wixImageUrl";
import { OPEN_ADDRESS_HOURS } from "./ContactBooking";

/**
 * "About the business" under the deal: a round photo (its logo, or else its
 * first profile photo), one paragraph of its description, and links to its
 * address and hours (the dialog in ContactBooking.tsx), its website and its
 * full profile. The profile (/business/[slug]) is where everything else
 * lives; this is deliberately not a second copy of it.
 *
 * The profile link carries ?from=<this deal> so the profile can offer
 * "Back to deal" (it checks the deal is really one of its own).
 */
export default function BusinessSummary({
  deal,
  preview,
  onWebsite,
  onProfileClick,
}: {
  deal: Deal;
  preview: boolean;
  onWebsite: () => void;
  onProfileClick: () => void;
}) {
  const name = deal.businessName?.trim();
  if (!name) return null;
  // One paragraph: the first the business wrote.
  const bio = (deal.businessBio ?? "").trim().split(/\n\s*\n/)[0]?.replace(/\s*\n\s*/g, " ") ?? "";
  const website = safeWebHref(deal.businessWebsite);
  const profile = deal.businessSlug && !preview ? `/business/${deal.businessSlug}?from=${encodeURIComponent(deal.slug)}` : null;
  const hasPlaceOrHours = Boolean(deal.businessAddress || deal.businessSuburb || deal.businessCity || deal.businessHours);
  const photo = deal.businessLogoUrl || deal.businessPhotos?.[0] || null;
  const link =
    "inline-flex min-h-[44px] items-center font-semibold text-hp-purple underline underline-offset-2 hover:text-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple";

  return (
    <section aria-labelledby="about-business">
      <h2 id="about-business" className="text-lg font-bold text-hp-ink">
        About the business
      </h2>
      <div className="mt-3 flex items-start gap-4 rounded-xl border border-hp-border bg-white p-4 sm:p-5">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(photo, 160, 160)}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="h-14 w-14 shrink-0 rounded-full bg-hp-lavender object-cover ring-1 ring-hp-border sm:h-16 sm:w-16"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-hp-lavender font-display text-2xl font-bold text-hp-purple sm:h-16 sm:w-16"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bold text-hp-ink">{name}</p>
          {bio && <p className="mt-1 line-clamp-4 max-w-[65ch] text-[0.9375rem] leading-relaxed text-hp-ink">{bio}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-5 text-sm">
            {hasPlaceOrHours && (
              <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ADDRESS_HOURS))} aria-haspopup="dialog" className={link}>
                Address &amp; hours
              </button>
            )}
            {website && !preview && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow ugc" onClick={onWebsite} className={link}>
                Website
                <span className="sr-only"> of {name} (opens in a new tab)</span>
              </a>
            )}
            {profile && (
              <Link href={profile} prefetch={false} onClick={onProfileClick} className={link}>
                View business profile <span aria-hidden="true">&nbsp;→</span>
              </Link>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
