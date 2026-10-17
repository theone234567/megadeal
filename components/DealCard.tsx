import Link from "next/link";
import type { ComponentType } from "react";
import type { Deal } from "@/lib/types";
import { formatMoney, formatOfferEndDate } from "@/lib/format";
import { dealSavingPercent } from "@/lib/dealSaving";
import { keyRestrictions } from "@/lib/dealTerms";
import { CATEGORIES } from "@/lib/categories";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import CountdownBadge from "./CountdownBadge";
import {
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  MapPinIcon,
  SuitcaseIcon,
  TagIcon,
  UtensilsIcon,
  WrenchIcon,
  ZapIcon,
} from "./icons";

const PLACEHOLDER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "food-drink": UtensilsIcon,
  "beauty-spa": FlowerIcon,
  "things-to-do": CompassIcon,
  "travel-getaways": SuitcaseIcon,
  "health-fitness": DumbbellIcon,
  "home-car": WrenchIcon,
};

/**
 * One card for Flash and Everyday Deals: photo with the saving on it, then
 * the deal type (a Flash Deal adds its real time left), title, business,
 * place and price. The whole card is the link to the deal.
 *
 * Deliberately not shown, though the Deal type carries them:
 * - businessRating: typed in by an admin, not aggregated from customer
 *   reviews, so presenting it as a star rating would claim more than it is.
 * - quantityAvailable: set once when the deal is created and never
 *   decremented (nothing is bought through MegaDeal), so "Only 3 left"
 *   would be a fixed number dressed up as live scarcity.
 * No save/favourite control either — deal hunters don't have accounts.
 */
export default function DealCard({
  deal,
  distanceKm = null,
  /** Shown inside the merchant's own preview, where the deal has no page
   *  to open yet. Renders the identical card without the link, so it can't
   *  navigate to a slug that 404s — taking their unsaved form with it — and
   *  Next doesn't prefetch that route just because the card scrolled into
   *  view. */
  preview = false,
  /** The card is the largest thing on screen when the page opens (a hero):
   *  its photo loads straight away instead of lazily. */
  priority = false,
  imageSizes = "(min-width: 1200px) 280px, (min-width: 768px) 33vw, calc(50vw - 22px)",
  /** "demo": an example on the prelaunch homepage (lib/demoDeals.ts),
   *  labelled DEMO, with no link, code or date. "launch": a real deal
   *  before launch, labelled "Available at launch", with no link (its page
   *  opens at launch). */
  variant = "default",
}: {
  deal: Deal;
  /** Distance from the viewer, in km — shown beside the locality when known. */
  distanceKm?: number | null;
  preview?: boolean;
  priority?: boolean;
  /** How wide the photo shows, for the browser to pick a copy: half the
   *  screen on a phone by default (a two-column grid). */
  imageSizes?: string;
  variant?: "default" | "demo" | "launch";
}) {
  const demo = variant === "demo";
  const soldOut = !deal.inStock;
  // From the two real prices: a "was" at or below the deal price is no saving.
  const savingPct = dealSavingPercent(deal.was, deal.now);
  const restrictions = keyRestrictions(deal.terms).slice(0, 2);
  const categorySlug = CATEGORIES.find((c) => c.name === deal.categories[0])?.slug ?? "";
  const PlaceholderIcon = PLACEHOLDER_ICONS[categorySlug] ?? TagIcon;
  const distance =
    distanceKm === null
      ? null
      : distanceKm < 1
      ? `${Math.round(distanceKm * 1000)}m away`
      : `${distanceKm.toFixed(1)}km away`;
  // The suburb when it's known ("Takapuna"), otherwise the city: with every
  // business in Auckland for now, the city alone tells a shopper little.
  const locality = [deal.businessSuburb || deal.businessCity, distance].filter(Boolean).join(" · ");

  const linked = !preview && variant === "default";
  const Wrapper = linked ? Link : "div";
  // prefetch off: a deal page is built fresh from Wix on every request, so
  // Next's automatic prefetch of each card in view ran a full Wix lookup
  // per card — a dozen at once just from looking at the homepage, enough
  // for Wix to start turning requests away and the clicked deal to fail.
  // The deal page's loading screen still shows as soon as it's clicked.
  // A test deal (lib/testDeals.ts) has no public page; its card goes to
  // the admin-only one.
  const wrapperProps = !linked
    ? {}
    : { href: deal.isTest ? `/admin/test-deals/${deal.id}` : `/deal/${deal.slug}`, prefetch: false };

  // Place and business on one line, one icon: the card's single metadata
  // row. The place first, so a narrow card cuts off the business name
  // rather than the suburb.
  const metaLine = [locality, deal.businessName].filter(Boolean).join(" · ");
  const footLine = demo
    ? "Example only · not a live offer"
    : [
        deal.expiresAt && !deal.isFlash && variant !== "launch" ? `Offer ends ${formatOfferEndDate(deal.expiresAt, false)}` : null,
        ...restrictions,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <Wrapper
      {...(wrapperProps as any)}
      // relative: the screen-reader-only price label is absolutely
      // positioned, and without a positioned card around it, it escaped the
      // Flash row's scroll area and made the whole page scroll sideways.
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hp-line bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 ${
        linked ? "hover:border-hp-purple/40 hover:shadow-card" : ""
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-hp-lavender">
        {deal.image ? (
          // A plain <img>: next/image makes no srcset while images are
          // unoptimized, and this lets a phone take a smaller copy
          // (wixImageSrcSet). The 3:2 copies the photo store makes, shown
          // a touch wider (16:10) by trimming the top and bottom.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wixImageUrl(deal.image, 750, 500)}
            srcSet={wixImageSrcSet(deal.image, [360, 540, 750], 3 / 2)}
            // A phone's two columns are half the screen less the page
            // margins and gap: "50vw" made a 3x phone take the 750px copy
            // for a 173px card instead of the 540px one.
            sizes={imageSizes}
            // Empty: the title is already the link's text, so repeating it
            // as the photo's alt made screen readers announce it twice.
            alt=""
            // A hero card's photo loads first. (Any photo that isn't lazy
            // also becomes a preload in the page's prefetched data, so
            // desktop pages showing a link to it fetch it in advance; phones,
            // where those links sit in the closed menu, don't.)
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" } : {})}
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${linked ? "group-hover:scale-[1.02]" : ""} ${soldOut ? "grayscale" : ""}`}
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center text-hp-purple/40">
            <PlaceholderIcon className="h-10 w-10" />
          </div>
        )}

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-hp-ink/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-hp-ink shadow">Sold out</span>
          </div>
        ) : (
          // The one marker on the photo: the saving, from the two real
          // prices. The type and the time left sit below the photo.
          savingPct !== null && (
            <span
              className={`absolute top-2 rounded-md bg-white px-2 py-0.5 text-xs font-bold text-hp-ink shadow-sm sm:top-2.5 sm:text-[0.8125rem] ${
                demo ? "right-2 sm:right-2.5" : "left-2 sm:left-2.5"
              }`}
            >
              {savingPct}% off
            </span>
          )
        )}
        {/* An example, in words, not just a colour: it can't be redeemed. */}
        {demo && (
          <span className="absolute left-2 top-2 rounded-md bg-hp-ink px-2 py-0.5 text-xs font-extrabold tracking-[0.08em] text-white sm:left-2.5 sm:top-2.5">
            DEMO
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5">
        {/* The deal type, and for a Flash Deal its real time left. Wraps
            under the label on a narrow card rather than squeezing. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold leading-5">
          {deal.isTest && (
            // Only ever seen by an admin before launch (lib/useTestDeals.ts).
            <span className="rounded bg-hp-ink px-1.5 text-white">Test deal · preview only</span>
          )}
          {variant === "launch" && <span className="rounded bg-[#E7F6EC] px-1.5 text-green-800">Available at launch</span>}
          {deal.isFlash ? (
            <>
              <span className="inline-flex items-center gap-1 rounded bg-[#FDE8F2] px-1.5 text-[#B8196A]">
                <ZapIcon className="h-3.5 w-3.5" />
                Flash
              </span>
              {deal.expiresAt && !soldOut && variant === "default" && (
                <CountdownBadge target={new Date(deal.expiresAt)} variant="ends" className="text-hp-flash" />
              )}
            </>
          ) : (
            <span className="rounded bg-hp-lavender px-1.5 text-hp-purple">Everyday</span>
          )}
        </p>
        {/* Two lines at most, and always two lines tall, so the rows of
            metadata and prices line up across a row of cards. */}
        <h3
          className={`line-clamp-2 min-h-[2.7em] font-display text-[0.9375rem] font-semibold leading-[1.35] text-hp-ink sm:text-base lg:text-[1.0625rem] ${
            linked ? "group-hover:text-hp-purple" : ""
          }`}
        >
          {demo && <span className="sr-only">Demo deal: </span>}
          {deal.name}
        </h3>
        {metaLine && (
          <p className="flex min-w-0 items-center gap-1 text-[0.8125rem] text-hp-muted">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{metaLine}</span>
          </p>
        )}

        {/* mt-auto keeps prices level across a row of cards. */}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="font-display text-xl font-semibold leading-none tracking-[-0.02em] text-hp-purple sm:text-[1.375rem] lg:text-2xl">
            {formatMoney(deal.now, deal.currency, deal.formattedNow)}
          </span>
          {savingPct !== null && (
            <span className="text-sm text-hp-muted line-through">
              <span className="sr-only">Usual price </span>
              {formatMoney(deal.was, deal.currency, deal.formattedWas)}
            </span>
          )}
        </div>
        {/* The last line, in a fixed place: when the offer ends, then its
            main conditions — the date first, so a long condition can't
            push it out of view. "Offer ends", never "Valid until": the
            deadline to get the deal, not the dates it can be used on. A
            Flash Deal's time left is on its label line instead. */}
        {/* Always rendered, empty or not, so every card in a row keeps
            this line's height and the prices above it stay level. */}
        <p className="truncate text-xs text-hp-muted" aria-hidden={footLine ? undefined : true}>
          {footLine || "\u00a0"}
        </p>
      </div>
    </Wrapper>
  );
}
