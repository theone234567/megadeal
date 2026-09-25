import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import SampleDealCard from "@/components/SampleDealCard";
import { getSignupStats } from "@/lib/publicStats";
import MascotFigure from "@/components/megadeal/MascotFigure";
import { getMegadealArt } from "@/lib/megadealAssets";
import {
  CheckIcon,
  DumbbellIcon,
  FlowerIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TicketIcon,
  UsersIcon,
  UtensilsIcon,
  WrenchIcon,
} from "@/components/icons";

// The root layout wraps every page title in a "%s | MegaDeal" template, so
// this must NOT carry the brand itself or the tab reads "MegaDeal Auckland
// — Big Local Deals Are On The Way | MegaDeal". SOCIAL_TITLE is the
// standalone version: openGraph.title and twitter.title bypass the
// template, so those do need the brand spelled out.
const TITLE = "Big Local Deals Are On The Way in Auckland";
const SOCIAL_TITLE = "MegaDeal Auckland — Big Local Deals Are On The Way";
const DESCRIPTION =
  "MegaDeal is launching in Auckland first. Join for launch updates, or claim up to 6 months free advertising for your business — 0% commission.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  robots: { index: true, follow: true },
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_NZ",
  },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
};

/**
 * Supplied mascot / skyline artwork, resolved once at build time. Each
 * entry is null until the PNG is added to public/megadeal, and every use
 * below falls back to the vector already shipping — so the page is whole
 * either way. See public/megadeal/README.md.
 */
const art = getMegadealArt();

/** Guards the hero's photo layer (both the lg+ full-bleed background and
 *  the <lg standalone panel) — true today (public/megadeal/hero-auckland-
 *  card.webp is committed), but the hero still degrades to its flat
 *  brand-gradient background with no photo, rather than a broken image,
 *  on the off chance that file is ever removed. */
const hasComposedCard = Boolean(art.aucklandCard);

/** One shared page shell width, so every band lines up at every breakpoint. */
const shell = "mx-auto w-full max-w-[1320px] px-5 sm:px-6 xl:px-10";

/**
 * Applied (lg and up only, via the lg: prefix baked into each usage) to
 * every piece of hero text that sits above the lg+ background photo — the
 * headline, the paragraph, the proof points, and the stats bar (that last
 * one is only a bg-white/12 panel, not fully opaque, so it's exposed to
 * the same risk even though it's rarely visible in local dev — it only
 * renders once there are enough real signups, which needs live Wix data
 * this environment doesn't have). Real photography has its
 * own light and dark spots (an eye's white sclera, a specular highlight
 * inside an ear) that land under this fixed-position text at whatever
 * exact pixel the current viewport width happens to put them — confirmed
 * by directly sampling rendered pixels, not assumed: at 1770px the comma
 * in "way," sat on the elephant's eye-white at ~1:1 contrast with no
 * shadow, and separately the paragraph's last line sat right against an
 * ear highlight. No amount of retuning the crop/gradient rules out the
 * next coincidence at some other width; a shadow makes every character
 * readable regardless of what's directly behind it. Below lg the
 * background is flat purple and this is never applied, so it never adds
 * pointless visual noise there.
 */
const HERO_TEXT_SHADOW = "lg:[text-shadow:0_2px_10px_rgba(36,4,74,0.55),0_1px_3px_rgba(36,4,74,0.5)]";

const categories = [
  {
    name: "Food & Drink",
    hasCategoryPage: true,
    icon: UtensilsIcon,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Beauty & Spa",
    hasCategoryPage: true,
    icon: FlowerIcon,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Things To Do",
    hasCategoryPage: true,
    icon: TicketIcon,
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Travel & Getaways",
    hasCategoryPage: true,
    icon: SuitcaseIcon,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Health & Fitness",
    hasCategoryPage: true,
    icon: DumbbellIcon,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Home & Car",
    hasCategoryPage: true,
    icon: WrenchIcon,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=720&q=72",
  },
] as const;

const trustPoints = [
  [TicketIcon, "No vouchers to buy"],
  [StoreIcon, "Deal directly with local businesses"],
  [UsersIcon, "Support businesses in your city"],
  [MapPinIcon, "Auckland first • Wellington, Christchurch, Queenstown & Hamilton next"],
] as const;

const steps = [
  ["1", SearchIcon, "Find a deal", "Browse offers from local Auckland businesses."],
  ["2", TicketIcon, "Get the deal code", "No payment or voucher purchase required."],
  ["3", PhoneIcon, "Book direct & enjoy", "Contact the business, quote your code and pay them directly."],
] as const;

const businessBenefits = [
  "0% commission on every sale",
  "Up to 6 months advertising free*",
  "Customers deal directly with you",
  "A simple way to fill quieter periods",
];

const launchCities = ["Wellington", "Christchurch", "Queenstown", "Hamilton"];

/**
 * Same bar /list-your-business uses. Real counts are far better social
 * proof than none, but "3 businesses signed up" reads worse than staying
 * quiet — so nothing is shown until there is a number worth showing.
 */
const MIN_APPROVED_BUSINESSES_TO_SHOW_STATS = 33;

/** Defaults to the brand purple; the deal-hunters section below passes
 *  its own sky-blue accent instead so its checkmarks match that
 *  section's color, not the page's default. */
function Tick({ children, color = "#650fc7" }: { children: ReactNode; color?: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] font-semibold leading-6 text-[#18122d]">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        <CheckIcon className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Brand-purple wash over the hero's background photo, solid behind the
 * text column and fading out over the photo — rgba(101,15,199,*) is
 * brand-700 (#650fc7), the same literal purple the rest of this hero
 * already uses, not a new colour.
 *
 * Fixed pixel width, not a percentage of the section: the text column is
 * a fixed max-width (500px + the shell's own padding), but the photo
 * underneath is a single object-cover layer whose visible crop shifts
 * continuously as the viewport gets wider. A percentage-based gradient
 * drifts out of alignment with that fixed-width text column between
 * tested breakpoints — it looked fine at 1440px and 1920px but let the
 * elephant's face land squarely behind the headline somewhere in
 * between, which is exactly the bug this was rebuilt to fix. Anchoring
 * the wash to a fixed px width instead means it always ends in the same
 * place relative to the text column, at every viewport width, not just
 * the ones actually screenshotted.
 *
 * `width` and the fade shape differ between the two photo crops below —
 * each crop lands the elephant at a different absolute pixel position
 * (they're deliberately different zoom levels, see the comments on each
 * <Image>), so each needs its own wash tuned to still cover the text
 * column without also smothering that crop's elephant. Not extracted to
 * one shared shape.
 */
function HeroGradientWash({
  width,
  stops,
}: {
  width: number;
  stops: string;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-y-0 left-0"
      style={{ width, backgroundImage: `linear-gradient(90deg, ${stops})` }}
    />
  );
}

export default async function ComingSoonPage() {
  // Real figures from Wix, never invented. Null (and so hidden) when the
  // credentials are unavailable or the numbers are still too small.
  const rawStats = await getSignupStats();
  const stats =
    rawStats && rawStats.merchantCount >= MIN_APPROVED_BUSINESSES_TO_SHOW_STATS ? rawStats : null;

  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-[#171128]`}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: SOCIAL_TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/coming-soon`,
            inLanguage: "en-NZ",
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
            about: [
              { "@type": "Place", name: "Auckland, New Zealand" },
              { "@type": "Thing", name: "Local deals" },
              { "@type": "Thing", name: "Local business advertising" },
            ],
          }),
        }}
      />

      {/* ---------------------------------------------------------------- Hero */}
      {/* One integrated visual instead of "purple text column beside a
          separate rounded photo card": the Auckland artwork is now a
          full-bleed background layer behind everything, with a
          left-to-right brand-purple gradient over it so the text side
          reads as solid purple and the right side reads as the photo,
          blending into each other rather than meeting at a hard edge.
          bg-gradient-to-br here is the base fill for <lg (where the photo
          layer below is hidden entirely) and shows for a fraction of a
          second on lg+ before the photo/gradient layer paints over it —
          same brand-500→800 colours either way, so there's nothing to see
          in that gap. */}
      <section
        id="cs-hero"
        className="relative isolate overflow-hidden bg-[#650fc7] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-800 text-white"
      >
        {/* Photo + gradient layer: lg (1024px) and up only. Below that the
            artwork moves into its own panel underneath the content instead
            (see the bottom of this section) — this treatment needs real
            width to work: tried it down to md (768px) first, and at that
            width there wasn't enough room left of the text column for the
            elephant to read as anything but a purple smear, and the
            headline started colliding with "Dine Explore Relax" behind it.
            A tablet screen gets the same clean stacked panel mobile does,
            just at a larger size (see the sizing on that panel below). */}
        {hasComposedCard && (
          <div className="absolute inset-0 hidden lg:flex lg:items-center lg:justify-end">
            {/* No cropping, at all — this is the important change from the
                previous version. object-fit: cover (used before) fills its
                box completely by magnifying and cropping whatever doesn't
                fit; that's what "zoomed" actually meant — it wasn't a bad
                crop position, it was cover itself, doing exactly what
                cover always does. No amount of resizing or repositioning
                that box was ever going to stop it looking zoomed, because
                the box's aspect ratio never matched the photo's own.

                Fixed here by making the box's aspect ratio match the
                artwork's native ratio exactly (aspect-[1800/619], its real
                pixel dimensions) instead of stretching to fill the
                section's height or a fixed max-width. With the ratios
                identical, object-contain and object-cover produce the
                same result — the whole photo, undistorted, at whatever
                size the box happens to be. Sized by height via a clamp
                (not the section's own height, which is driven by the text
                column and was the earlier "elephant too big" bug), width
                follows automatically from the aspect ratio. */}
            <div className="relative h-[clamp(240px,26vw,420px)] aspect-[1800/619]">
              <Image
                src={art.aucklandCard as string}
                alt="The MegaDeal elephant mascot in front of the Auckland skyline and Sky Tower"
                fill
                sizes="50vw"
                className="object-contain"
                loading="eager"
                fetchPriority="high"
              />
              {/* Fades on three sides — left, top, bottom — blend this
                  box's own edges into the surrounding purple instead of
                  showing a hard rectangle (a plain sky-blue-meets-purple
                  line reads as "a photo stuck in a box", exactly the look
                  this hero was rebuilt to avoid). No rounded corners, no
                  border, no drop shadow — nothing that would read as a
                  card frame, just the photo itself dissolving into the
                  background. No fade on the right: the photo is flush
                  against the section's own right edge (this wrapper is
                  justify-end), so there's no purple beyond it on that
                  side to blend into — it just continues off-screen.

                  Sized in %, not px: this box is object-contain (never
                  cropped), so — unlike the old cover-cropped version,
                  where anything near an edge was already hidden by the
                  crop — the character's real silhouette can sit close to
                  the artwork's own edges, and a fixed-px fade doesn't
                  scale with the box's responsive size. Measured against
                  the actual source file (edge-detected against its
                  background gradient): the raised paw's nearest pixel
                  sits at 11.6% of width, the head-tuft's at 5.2% of
                  height — these percentages stay clear of both with a
                  margin, at every box size. Bottom has no clear margin at
                  all (the hoodie hem runs to the artwork's true bottom
                  edge) but the overlap there is purple fabric fading into
                  the same purple wash, so it reads as continuation, not
                  concealment. */}
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-[8%]"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(101,15,199,0.95) 0%, rgba(101,15,199,0) 100%)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3.5%]"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(101,15,199,0.85) 0%, rgba(101,15,199,0) 100%)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[5%]"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, rgba(101,15,199,0.85) 0%, rgba(101,15,199,0) 100%)",
                }}
              />
            </div>
            <HeroGradientWash
              width={620}
              stops="rgba(101,15,199,0.97) 0px, rgba(101,15,199,0.94) 460px, rgba(101,15,199,0.72) 520px, rgba(101,15,199,0.32) 565px, rgba(101,15,199,0.08) 600px, rgba(101,15,199,0) 620px"
            />
          </div>
        )}

        <div
          className={`${shell} relative pb-8 pt-7 sm:pb-10 sm:pt-10 lg:min-h-[clamp(480px,38vw,580px)] lg:py-10 lg:flex lg:flex-col lg:justify-center`}
        >
          <div className="lg:max-w-[500px]">
            <div className="inline-flex rounded-full bg-[#c7128a] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-sm sm:px-5 sm:text-sm">
              Launching first in Auckland
            </div>
            <h1
              className={`${fredoka.className} mt-4 text-4xl font-bold leading-[0.98] tracking-[-0.02em] sm:text-5xl lg:mt-5 lg:text-[64px] ${HERO_TEXT_SHADOW}`}
            >
              Big local deals are on the way, Auckland.
            </h1>
            <p className={`mt-4 max-w-[480px] text-[15px] leading-6 text-white/95 lg:mt-6 lg:text-[18px] lg:leading-8 ${HERO_TEXT_SHADOW}`}>
              MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet
              times and helping deal hunters discover standout local offers.
            </p>
            {/* Stacked rather than inline-with-a-separator: the hero column
                is narrow enough at most widths that a "a • b" row wraps and
                leaves the bullet dangling at the end of the first line. */}
            <div className={`mt-4 flex flex-col gap-1 text-sm font-extrabold leading-6 lg:mt-5 lg:text-[17px] lg:leading-7 ${HERO_TEXT_SHADOW}`}>
              <span>0% commission for businesses</span>
              <span>Up to 6 months advertising free*</span>
            </div>

            {stats && (stats.merchantCount > 0 || stats.waitlistCount > 0) && (
              <div className={`mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-2xl bg-white/12 px-4 py-3 text-[13px] font-semibold text-white/95 ring-1 ring-inset ring-white/20 sm:text-sm ${HERO_TEXT_SHADOW}`}>
                {stats.merchantCount > 0 && (
                  <span>
                    <span className="font-extrabold">{stats.merchantCount.toLocaleString()}</span>{" "}
                    Auckland businesses signed up
                  </span>
                )}
                {stats.waitlistCount > 0 && (
                  <span>
                    <span className="font-extrabold">{stats.waitlistCount.toLocaleString()}</span>{" "}
                    locals waiting for launch day
                  </span>
                )}
              </div>
            )}
          </div>

          {/*
            Two audience cards — the page's "which are you?" fork. Sits in
            normal document flow now (no more grid-order juggling to pull
            it ahead of the photo on mobile): the photo moved to the very
            end of this section for <md screens, so simple DOM order alone
            already puts pitch → proof points → these cards → photo,
            exactly the sequence a visitor should hit them in.

            Each card is a single link rather than a card containing a
            button, so the whole tile is one large tap target and the
            inner pill is a <span>. On phones they collapse to a compact
            row (icon, question, one-line action) for the same reason as
            the reorder: get to a choice fast.
          */}
          <div className="mt-5 sm:mt-6 lg:mt-8 lg:max-w-[620px]">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:gap-5">
              <a
                href="#launch-updates"
                className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#e81ea3]/40 sm:items-center sm:gap-4 sm:rounded-[20px] sm:p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe1f2] text-[#c7128a] sm:h-12 sm:w-12">
                  <TicketIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2 className={`${fredoka.className} text-lg font-bold leading-tight text-[#191333] sm:text-xl`}>
                    Love a great deal?
                  </h2>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-[#c7128a] underline-offset-4 group-hover:underline sm:text-sm">
                    Get launch updates →
                  </span>
                </span>
              </a>

              <Link
                href="/list-your-business"
                className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#650fc7]/40 sm:items-center sm:gap-4 sm:rounded-[20px] sm:p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#650fc7] sm:h-12 sm:w-12">
                  <StoreIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2 className={`${fredoka.className} text-lg font-bold leading-tight text-[#191333] sm:text-xl`}>
                    Run a local business?
                  </h2>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-[#650fc7] underline-offset-4 group-hover:underline sm:text-sm">
                    <span className="sm:hidden">Up to 6 months free →</span>
                    <span className="hidden sm:inline">Claim my free advertising →</span>
                  </span>
                </span>
              </Link>
            </div>
          </div>

          {/* Mobile/tablet-only photo panel — same artwork, its own block
              instead of a background layer, full composition visible
              (nothing cropped off to the sides the way the md+ background
              layer needs to). Same aspect ratio as the artwork's own
              native size, so object-cover never actually has to crop. */}
          {hasComposedCard && (
            <div className="relative mt-6 aspect-[1800/619] w-full overflow-hidden rounded-2xl lg:hidden">
              <Image
                src={art.aucklandCard as string}
                alt="The MegaDeal mascot elephant with the Auckland skyline"
                fill
                sizes="100vw"
                className="object-cover"
                loading="eager"
              />
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------- Trust strip */}
      <section className={`${shell} py-6 lg:py-8`}>
        <div className="grid overflow-hidden rounded-[18px] bg-[#f7f7fb] ring-1 ring-[#eceaf2] sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map(([Icon, text], index) => (
            <div
              key={text}
              className={`flex min-h-[80px] items-center gap-3 px-5 py-5 lg:min-h-[100px] lg:px-7 ${
                index ? "border-t border-[#e4e1eb] sm:border-t-0" : ""
              } ${index % 2 ? "sm:border-l sm:border-[#e4e1eb]" : ""} ${
                index >= 2 ? "sm:border-t sm:border-[#e4e1eb] lg:border-t-0" : ""
              } ${index ? "lg:border-l lg:border-[#e4e1eb]" : ""}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#650fc7] shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-bold leading-5 text-[#292243]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- How MegaDeal works */}
      <section className={`${shell} py-8 lg:py-10`}>
        <div className="rounded-[22px] bg-[#650fc7] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-800 px-5 py-7 text-white shadow-[0_16px_40px_rgba(69,16,141,.12)] sm:px-8 sm:py-8 lg:rounded-[26px]">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h2 className={`${fredoka.className} text-2xl font-bold sm:text-3xl`}>
                How MegaDeal works
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/70">Simple. Direct. Local.</p>
            </div>
            <p className="text-sm font-semibold italic text-white/75">Local deals made easy.</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 lg:mt-6 lg:gap-4">
            {steps.map(([number, Icon, title, copy]) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-[18px] border border-white/10 bg-white/5 p-4 lg:min-h-[132px] lg:p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c7128a] text-sm font-extrabold">
                  {number}
                </span>
                <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#650fc7] sm:flex">
                  <Icon className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-display font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-white/70">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- For local businesses
          Placed right after "How MegaDeal works" rather than after the
          consumer signup section below — the previous order ran four
          consumer-only sections in a row (trust strip, how it works,
          categories, deal-hunter signup) before a business owner saw
          anything for them again. This is the first thing a business
          owner who doesn't click the hero card sees.

          Light background rather than the full purple gradient this used
          to share with "How MegaDeal works" right above it: once the two
          sections became neighbours, back-to-back full-bleed purple read
          as one long undifferentiated block instead of two distinct
          ideas — worse on mobile, where they stack with nothing but a
          thin trust strip between them. brand-50 keeps the section tied
          to the palette without adding to that run; purple/pink stay as
          accents (badges, checkmarks, the CTA button) rather than the
          whole background. */}
      <section className="relative overflow-hidden bg-brand-50 py-10 lg:py-14">
        <MascotFigure
          src={art.mascotJump}
          fallbackSrc="/brand/megadeal-elephant.svg"
          alt=""
          width={300}
          height={340}
          className="absolute -bottom-6 right-2 hidden h-auto w-[150px] opacity-[0.35] lg:block xl:right-10 xl:w-[190px]"
        />
        <div className={`${shell} relative z-10`}>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ember-600">
                For local businesses
              </p>
              <h2
                className={`${fredoka.className} mt-2 max-w-[620px] text-2xl font-bold leading-tight text-[#18122d] sm:text-3xl`}
              >
                Fill quiet times. Grow local customers.
              </h2>
              {/* Answers "is this even for my business?" before the reader
                  gets to the offer — a business owner's first question,
                  not a second-order detail. Kept to one line rather than
                  repeating the category grid below (which is written for
                  shoppers, not businesses) so the same list isn't
                  maintained in two places with two different framings. */}
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#18122d]">
                From cafés and salons to gyms and tour operators — if you serve local customers, you belong here.
              </p>
              <p className="mt-2.5 max-w-[620px] text-[15px] leading-6 text-slate-600 lg:text-base">
                Get in before we launch and your first months of advertising are on us. Once deals
                go live the offer closes, so the businesses that join now are the ones customers
                see on day one.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
                {businessBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] font-semibold leading-6 text-[#18122d]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c7128a] text-white">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/list-your-business"
                  className="inline-flex h-12 items-center rounded-full bg-[#c7128a] px-7 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#a10f70]"
                >
                  Claim my free advertising →
                </Link>
                <span className="text-sm font-semibold text-slate-600">
                  Takes about 60 seconds · No credit card
                </span>
              </div>
              {stats && stats.merchantCount > 0 && (
                <p className="mt-4 text-sm font-semibold text-ember-600">
                  {stats.merchantCount.toLocaleString()} Auckland businesses have already signed up.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-[#eee7f6] bg-white p-6 shadow-[0_14px_34px_rgba(77,12,168,.10)] sm:p-7">
              <p className={`${fredoka.className} text-xl font-bold text-[#18122d] sm:text-2xl`}>
                What it costs you
              </p>
              <dl className="mt-4 space-y-3 text-[15px]">
                {[
                  ["Commission on your sales", "0%"],
                  ["Advertising before launch", "Free*"],
                  ["Customer payments", "Direct to you"],
                  ["Lock-in contract", "None"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 border-b border-[#eee7f6] pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="shrink-0 font-extrabold text-[#18122d]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Categories */}
      <section id="categories" className={`${shell} pb-8 lg:pb-10`}>
        <div className="text-center">
          <h2
            className={`${fredoka.className} text-2xl font-bold text-[#171128] sm:text-3xl`}
          >
            Explore deal categories
          </h2>
          <p className="mt-1 text-sm text-slate-500">A taste of what&apos;s coming to Auckland.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-6 lg:grid-cols-6 lg:gap-4">
          {categories.map(({ name, hasCategoryPage, icon: Icon, image }) => {
            const live = SITE_LAUNCHED && hasCategoryPage;
            return (
            <Link
              key={name}
              href={live ? `/category/${encodeURIComponent(name)}` : "#launch-updates"}
              aria-label={live ? `${name} deals` : `${name} — get notified when MegaDeal launches`}
              className="group overflow-hidden rounded-[18px] border border-[#e9e6f0] bg-white shadow-[0_8px_22px_rgba(28,18,54,.08)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(28,18,54,.12)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f4efff] to-[#e7d9ff]">
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center text-[#c3aaf0]"
                >
                  <Icon className="h-9 w-9" />
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
                  style={{ backgroundImage: `url("${image}")` }}
                />
              </div>
              <div className="flex min-h-[60px] items-center gap-2.5 px-3 py-3 lg:min-h-[64px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2ecff] text-[#650fc7] transition group-hover:bg-[#650fc7] group-hover:text-white">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[13px] font-extrabold leading-tight text-[#241a45] transition group-hover:text-[#650fc7] lg:text-sm">
                  {name}
                </span>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      <section id="launch-updates" className="scroll-mt-20 bg-[#e0f2fe] py-10 lg:py-14">
        <div className={shell}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0369a1]">
                For deal hunters
              </p>
              <h2
                className={`${fredoka.className} mt-2 max-w-[560px] text-2xl font-bold leading-tight text-[#18122d] sm:text-3xl`}
              >
                Be first in line for launch deals
              </h2>
              <p className="mt-2.5 max-w-[560px] text-[15px] leading-6 text-slate-600 lg:text-base">
                Real offers from real Auckland businesses — restaurants, spas, activities and
                getaways. No vouchers to buy, and you deal directly with the business.
              </p>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 sm:gap-x-8">
                <Tick color="#0369a1">Free to join, unsubscribe anytime</Tick>
                <Tick color="#0369a1">Early access before deals go public</Tick>
              </ul>

              <div className="mt-6 max-w-[520px]">
                <EmailSignupForm
                  audience="customer"
                  source="coming-soon"
                  buttonLabel="Get launch updates →"
                  accent="ember"
                  surface="plain"
                  layout="stacked"
                />
              </div>
              {stats && stats.waitlistCount > 0 && (
                <p className="mt-3 text-sm font-semibold text-[#0369a1]">
                  Join {stats.waitlistCount.toLocaleString()} locals already on the list.
                </p>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-[320px] lg:max-w-none">
              <MascotFigure
                src={art.mascotWave}
                fallbackSrc="/brand/megadeal-elephant.svg"
                alt=""
                width={320}
                height={250}
                className="absolute -left-24 -top-14 z-10 hidden h-auto w-[120px] -scale-x-100 drop-shadow-[0_12px_20px_rgba(69,16,141,.18)] lg:block xl:-left-32 xl:w-[148px]"
              />
              <SampleDealCard />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Launch plan */}
      <section className={`${shell} py-10 lg:py-14`}>
        <div className="overflow-hidden rounded-[24px] bg-[#f8f6fc] px-5 py-7 ring-1 ring-[#ece7f2] sm:px-8 sm:py-9 lg:rounded-[28px] lg:px-10 lg:py-10">
          <div className="max-w-[700px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#c7128a]">
              Where we&apos;re heading
            </p>
            <h2 className={`${fredoka.className} mt-2 text-2xl font-bold leading-tight text-[#18122d] sm:text-3xl`}>
              Auckland first. Then nationwide.
            </h2>
            <p className="mt-2.5 text-[15px] leading-6 text-slate-600 lg:text-base">
              We&apos;re starting local, learning what works, then taking MegaDeal to more New Zealand communities.
            </p>
          </div>

          <div className="relative mt-7 lg:mt-9">
            <div className="absolute bottom-6 left-5 top-6 w-px bg-[#d8c8ed] lg:hidden" aria-hidden />
            <div className="absolute left-[16.7%] right-[16.7%] top-5 hidden h-px bg-[#d8c8ed] lg:block" aria-hidden />

            <div className="relative grid gap-5 lg:grid-cols-3 lg:gap-6">
              <div className="relative grid grid-cols-[42px_minmax(0,1fr)] gap-4 lg:block">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#c7128a] text-xs font-extrabold text-white shadow-[0_6px_18px_rgba(232,30,163,.24)] lg:mx-auto">
                  01
                </div>
                <div className="rounded-[20px] bg-[#650fc7] p-5 text-white shadow-[0_14px_34px_rgba(77,12,168,.18)] lg:mt-5 lg:min-h-[190px] lg:p-6">
                  <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white ring-1 ring-inset ring-white/20">
                    Launching first
                  </span>
                  <h3 className={`${fredoka.className} mt-3 text-xl font-bold`}>Auckland Launch</h3>
                  <p className="mt-2 text-sm leading-6 text-white/82">
                    Discover launch deals from businesses across Auckland.
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-[42px_minmax(0,1fr)] gap-4 lg:block">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#650fc7] ring-2 ring-[#d8c8ed] lg:mx-auto">
                  02
                </div>
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-[#e9e4ef] lg:mt-5 lg:min-h-[190px] lg:p-6">
                  <h3 className={`${fredoka.className} text-xl font-bold text-[#18122d]`}>Growing Across NZ</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    We&apos;ll expand into more cities and regions as the MegaDeal community grows.
                  </p>
                  <p className="mt-3 text-xs font-bold leading-5 text-[#6d24dc]">
                    {launchCities.join(" • ")}
                  </p>
                </div>
              </div>

              <div className="relative grid grid-cols-[42px_minmax(0,1fr)] gap-4 lg:block">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#650fc7] ring-2 ring-[#d8c8ed] lg:mx-auto">
                  03
                </div>
                <div className="rounded-[20px] bg-white p-5 ring-1 ring-[#e9e4ef] lg:mt-5 lg:min-h-[190px] lg:p-6">
                  <h3 className={`${fredoka.className} text-xl font-bold text-[#18122d]`}>Nationwide MegaDeals</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    One place to discover great deals from local businesses throughout New Zealand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          *Up to 6 months free advertising is for eligible new business listings approved before
          launch.{" "}
          <Link href="/terms" className="underline hover:text-[#650fc7]">
            Terms and Conditions
          </Link>{" "}
          apply.
        </p>
      </section>
    </main>
  );
}
