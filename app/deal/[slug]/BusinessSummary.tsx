import Link from "next/link";
import type { Deal } from "@/lib/types";
import type { DealAction } from "@/lib/dealEvents";
import { safeWebHref } from "@/lib/socialLinks";
import { wixImageUrl } from "@/lib/wixImageUrl";

/**
 * A short "About [business]" under the deal: logo, a couple of lines of
 * its description, and links to its address and hours, its website and
 * its full profile. The profile (/business/[slug]) is where everything
 * else lives; this is deliberately not a second copy of it.
 *
 * The profile links carry ?from=<this deal> so the profile can offer
 * "Back to deal" (it checks the deal is really one of its own).
 */
export default function BusinessSummary({
  deal,
  preview,
  onAction,
}: {
  deal: Deal;
  preview: boolean;
  onAction: (action: DealAction) => void;
}) {
  const name = deal.businessName?.trim();
  if (!name) return null;
  const bio = deal.businessBio?.trim() ?? "";
  const website = safeWebHref(deal.businessWebsite);
  const profile = deal.businessSlug && !preview ? `/business/${deal.businessSlug}?from=${encodeURIComponent(deal.slug)}` : null;
  const hasPlaceOrHours = Boolean(deal.businessAddress || deal.businessSuburb || deal.businessCity || deal.businessHours);
  const link = "inline-flex min-h-[44px] items-center font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";

  return (
    <section
      aria-labelledby="about-business"
      className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5 lg:mt-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {deal.businessLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(deal.businessLogoUrl, 160, 160)}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="h-14 w-14 shrink-0 rounded-full bg-slate-50 object-cover ring-1 ring-slate-200 sm:h-16 sm:w-16"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-2xl font-semibold text-brand-700 sm:h-16 sm:w-16"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h2 id="about-business" className="font-display text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
            About {name}
          </h2>
          {bio && <p className="mt-1 line-clamp-2 text-[0.9375rem] leading-relaxed text-slate-700">{bio}</p>}
          {!preview && (profile || website) && (
            <p className="flex flex-wrap items-center gap-x-4 text-sm">
              {profile && hasPlaceOrHours && (
                <Link href={`${profile}#contact`} prefetch={false} className={link}>
                  Address &amp; hours
                </Link>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  onClick={() => onAction("website")}
                  className={link}
                >
                  Website
                  <span className="sr-only"> of {name} (opens in a new tab)</span>
                </a>
              )}
            </p>
          )}
        </div>
      </div>
      {profile && (
        <Link
          href={profile}
          prefetch={false}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 self-start text-sm font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800 sm:self-center"
        >
          View business profile <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
