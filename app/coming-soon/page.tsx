import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import SampleDealCard from "@/components/SampleDealCard";
import { getSignupStats } from "@/lib/publicStats";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";
import MascotFigure from "@/components/megadeal/MascotFigure";
import { getMegadealArt } from "@/lib/megadealAssets";
import { HERO_PHOTO } from "@/lib/megadealAssetManifest.generated";
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
 * Real photography beats the illustration whenever it exists.
 *
 * Drop a file at public/images/auckland-hero.(jpg|jpeg|webp|avif|png) and
 * the hero uses it instead of AucklandSkylineArt — no code change needed,
 * just a rebuild. Resolved at build time by
 * scripts/generate-megadeal-manifest.mjs into HERO_PHOTO, not checked live
 * here: this page awaits getSignupStats() below, which makes it a
 * dynamic/revalidating route, and its top-level code genuinely re-runs
 * inside the live Cloudflare Workers runtime on every render — where a
 * direct fs.existsSync check silently fails every time (see the long
 * comment in lib/megadealAssets.ts, which had the identical bug for the
 * supplied mascot art).
 */
const heroPhoto = HERO_PHOTO;

/**
 * Supplied mascot / skyline artwork, resolved once at build time. Each
 * entry is null until the PNG is added to public/megadeal, and every use
 * below falls back to the vector already shipping — so the page is whole
 * either way. See public/megadeal/README.md.
 */
const art = getMegadealArt();

/** The supplied skyline card wins over a photo drop, which in turn wins
 *  over the illustration. All three are the same slot in the layout. */
const heroCardImage = art.aucklandCard ?? heroPhoto;

/**
 * The supplied card (art.aucklandCard) is a finished illustration — its
 * own white border, drop shadow and few-degree tilt are already baked
 * into the pixels, filling its canvas edge to edge. The photo/SVG
 * fallbacks below it are raw, unframed content instead: a plain skyline
 * photo, or a flat vector fill.
 *
 * Those two need different treatment, not the same box. A raw photo needs
 * the CSS to build the "tilted photo card" look around it (the rotate,
 * the white border, the angled clip-path). Wrapping the *already-composed*
 * card in that same CSS card doubles every one of those effects: a second
 * white border, at a slightly different angle to the one already drawn in
 * the image, showed through beside it — most visibly at the top-right
 * corner, which is what actually looked "off" about the Auckland card.
 */
const hasComposedCard = Boolean(art.aucklandCard);

/** One shared page shell width, so every band lines up at every breakpoint. */
const shell = "mx-auto w-full max-w-[1320px] px-5 sm:px-6 xl:px-10";

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
    hasCategoryPage: false,
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

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] font-semibold leading-6 text-[#18122d]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#650fc7] text-white">
        <CheckIcon className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
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
      {/* Gradient rather than the flat fill it replaced: brand-500 into
          brand-800 gives the hero depth behind the white skyline card and
          the mascot, without introducing any colour outside the palette. */}
      <section
        id="cs-hero"
        className="relative overflow-hidden bg-[#650fc7] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-800 text-white"
      >
        <div
          className={`${shell} grid items-center gap-6 pb-0 pt-7 sm:gap-10 sm:py-12 lg:min-h-[590px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-14`}
        >
          <div className="order-1 lg:max-w-[640px]">
            <div className="inline-flex rounded-full bg-[#c7128a] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-sm sm:px-5 sm:text-sm">
              Launching first in Auckland
            </div>
            <h1
              className={`${fredoka.className} mt-4 text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl lg:mt-5`}
            >
              Big local deals are on the way, Auckland.
            </h1>
            <p className="mt-4 max-w-[610px] text-[15px] leading-6 text-white/95 lg:mt-6 lg:text-[18px] lg:leading-8 2xl:text-[20px]">
              MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet
              times and helping deal hunters discover standout local offers.
            </p>
            {/* Stacked rather than inline-with-a-separator: the hero column
                is narrow enough at most widths that a "a • b" row wraps and
                leaves the bullet dangling at the end of the first line. */}
            <div className="mt-4 flex flex-col gap-1 text-sm font-extrabold leading-6 lg:mt-5 lg:text-[17px] lg:leading-7">
              <span>0% commission for businesses</span>
              <span>Up to 6 months advertising free*</span>
            </div>

            {stats && (stats.merchantCount > 0 || stats.waitlistCount > 0) && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-2xl bg-white/12 px-4 py-3 text-[13px] font-semibold text-white/95 ring-1 ring-inset ring-white/20 sm:text-sm">
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

            {/*
              No button row here on purpose. This used to carry its own
              "Claim free advertising" / "Get launch updates" pair — the
              exact same fork, to the exact same two destinations, as the
              two-card section immediately below it. A visitor hit the same
              decision twice in one screen before scrolling past the fold.
              Cards, not buttons, are the singular fork now: same two
              destinations, but with real explanatory copy per audience
              instead of a bare three-word pill, and already designed to
              sit hero-adjacent (see the negative margin pulling that
              section up into this one on desktop, right below).
            */}
          </div>

          {/*
            On phones this is a full-bleed band; from sm up it becomes the
            tilted, bordered "photo card" the desktop layout is built
            around.

            The card treatment does not survive a narrow screen. The
            rotation, the angled clip-path and the mascot deliberately
            overhanging the frame all assume space around the box — at
            390px the frame filled the column, so the mascot's "BIG DEALS"
            tag was sliced off by the section's overflow and the tilt just
            read as a crooked box. Mobile therefore drops the rotation,
            the clip-path and the border, bleeds the art edge to edge, and
            keeps the mascot inside the picture at a size that doesn't
            bury the skyline.
          */}
          <div className="relative order-3 -mx-5 pb-0 sm:mx-auto sm:w-full sm:max-w-[720px] sm:pb-8 sm:pr-7 lg:order-2 lg:pt-2">
            {hasComposedCard ? (
              /* The card as delivered: a plain box at the artwork's own
                 native ratio (4/3, exactly — it fills that canvas corner to
                 corner with no transparent margin to speak of), no rotate,
                 no added border, no clip-path. The tilt, border and shadow
                 a viewer sees are the image's own pixels, not CSS built
                 around them, so there is nothing left to double up.
                 The mascot is composited into this photo itself (standing
                 on the beach, Rangitoto in the background), so there is no
                 separate MascotFigure overlay here any more — the earlier
                 versions (a plain skyline photo, or the vector fallback)
                 needed the elephant added in CSS on top; this one doesn't.
                 aspect-[16/10] on mobile only, back to the photo's own
                 native aspect-[4/3] from sm: up — a shorter crop asked
                 for specifically on mobile, where it was costing more
                 scroll than its own visual payoff justified; the desktop
                 presentation was already working and stays as is. */
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl sm:aspect-[4/3]">
                <img
                  src={art.aucklandCard as string}
                  alt="The MegaDeal elephant mascot with a magnifying glass, standing on an Auckland beach with Rangitoto Island in the background"
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
              </div>
            ) : (
              /* No supplied card yet: build the "tilted photo card" look
                 around whatever raw content is available (a photo drop, or
                 failing that the flat vector fill) — same treatment as
                 before art.aucklandCard existed. */
              <div className="relative sm:rotate-[1.5deg]">
                <div className="relative aspect-[2/1] overflow-hidden border-y border-white/20 bg-white/10 sm:aspect-[1.28/1] sm:rounded-[28px] sm:border-[4px] sm:border-white/80 sm:shadow-2xl sm:[clip-path:polygon(7%_0,100%_0,94%_100%,0_100%)] lg:border-[5px] lg:shadow-[0_30px_80px_rgba(27,5,72,.34)]">
                  {heroCardImage ? (
                    <img
                      src={heroCardImage}
                      alt="Auckland city and harbour"
                      className="h-full w-full object-cover sm:-rotate-[1.5deg] sm:scale-[1.08]"
                      fetchPriority="high"
                    />
                  ) : (
                    <AucklandSkylineArt
                      shape="fill"
                      className="h-full w-full object-cover sm:-rotate-[1.5deg] sm:scale-[1.08]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#241044]/16 via-transparent to-transparent" />

                  {/* Mobile: inside the picture, clear of both edges so the
                      mascot's tag can't be clipped. */}
                  <MascotFigure
                    src={art.mascotBigDeals}
                    fallbackSrc="/brand/deal-hunter-elephant.svg"
                    alt=""
                    width={360}
                    height={280}
                    className="absolute bottom-0 right-2 h-auto w-[112px] drop-shadow-xl sm:hidden"
                  />
                </div>
              </div>
            )}

            {/* The overhanging desktop MascotFigure that used to sit here
                is gone: it existed to put the elephant on top of a plain
                skyline photo, and this photo already has him in it (see
                the comment above hasComposedCard's <img>). Bringing it
                back would double him up. The fallback branch above still
                keeps its own in-picture mascot, since it has no elephant
                of its own to fall back on. */}
          </div>

          {/*
            Two audience cards — the page's "which are you?" fork, and now
            a grid item in the hero itself rather than a separate section
            after it.

            Order, not just position, is what changed. This used to follow
            the hero unconditionally in DOM order — meaning on a phone,
            where everything stacks in one column, it followed the entire
            photo card too: on an iPhone SE it sat fully below the fold, on
            an iPhone 13 only its top sliver was visible. The photo is
            atmospheric; this is the actual decision a visitor came here to
            make, and it was consistently losing the race to be seen first.
            order-2 (mobile) puts it right after the pitch and before the
            photo; lg:order-3 with lg:col-span-2 restores exactly the
            previous desktop arrangement — text and photo side by side,
            this spanning both beneath them, same overlap as before.

            Each card is a single link rather than a card containing a
            button, so the whole tile is one large tap target and the
            inner pill is a <span>. On phones they collapse to a compact
            row (icon, question, one-line action) for the same reason as
            the reorder: get to a choice fast.
          */}
          <div className="order-2 -mx-5 px-5 pt-4 sm:mx-0 sm:px-0 sm:pt-6 lg:order-3 lg:col-span-2 lg:-mt-7 lg:pt-0">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:gap-5">
              <a
                href="#launch-updates"
                className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#e81ea3]/40 sm:items-center sm:gap-5 sm:rounded-[22px] sm:p-5 lg:min-h-[150px] lg:rounded-[24px] lg:p-7 lg:shadow-[0_18px_42px_rgba(40,7,88,.14)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe1f2] text-[#c7128a] sm:h-12 sm:w-12 lg:h-16 lg:w-16">
                  <TicketIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2
                    className={`${fredoka.className} text-lg font-bold leading-tight text-[#191333] sm:text-2xl md:text-3xl`}
                  >
                    Love a great deal?
                  </h2>
                  <span className="mt-1.5 hidden max-w-[500px] text-[15px] leading-6 text-slate-600 sm:block lg:mt-2">
                    Join free to get early access to local offers when MegaDeal launches in Auckland.
                  </span>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-[#c7128a] underline-offset-4 group-hover:underline sm:mt-2.5 sm:text-sm">
                    Get launch updates →
                  </span>
                </span>
              </a>

              <Link
                href="/list-your-business"
                className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#650fc7]/40 sm:items-center sm:gap-5 sm:rounded-[22px] sm:p-5 lg:min-h-[150px] lg:rounded-[24px] lg:p-7 lg:shadow-[0_18px_42px_rgba(40,7,88,.14)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#650fc7] sm:h-12 sm:w-12 lg:h-16 lg:w-16">
                  <StoreIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <h2
                    className={`${fredoka.className} text-lg font-bold leading-tight text-[#191333] sm:text-2xl md:text-3xl`}
                  >
                    Run a local business?
                  </h2>
                  <span className="mt-1.5 hidden max-w-[540px] text-[15px] leading-6 text-slate-600 sm:block lg:mt-2">
                    Join before launch and reach new customers, fill quieter periods and get up to 6
                    months advertising free with 0% commission.*
                  </span>
                  <span className="mt-0.5 block text-[13px] font-extrabold text-[#650fc7] underline-offset-4 group-hover:underline sm:mt-2.5 sm:text-sm">
                    <span className="sm:hidden">Up to 6 months free →</span>
                    <span className="hidden sm:inline">Claim my free advertising →</span>
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Trust strip */}
      <section className={`${shell} pt-5 lg:pt-6`}>
        <div className="grid overflow-hidden rounded-[18px] bg-[#f7f7fb] ring-1 ring-[#eceaf2] sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map(([Icon, text], index) => (
            <div
              key={text}
              className={`flex min-h-[72px] items-center gap-3 px-5 py-4 lg:min-h-[88px] lg:px-6 ${
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
                  <h3 className="font-extrabold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-white/70">{copy}</p>
                </div>
              </div>
            ))}
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

      <section id="launch-updates" className="scroll-mt-20 bg-[#fff5fa] py-10 lg:py-14">
        <div className={shell}>
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,360px)] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#c7128a]">
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
                <Tick>Free to join, unsubscribe anytime</Tick>
                <Tick>Early access before deals go public</Tick>
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
                <p className="mt-3 text-sm font-semibold text-[#a3175f]">
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

      <section className="relative overflow-hidden bg-[#650fc7] bg-gradient-to-br from-brand-500 via-brand-700 to-brand-800 py-10 text-white lg:py-14">
        <MascotFigure
          src={art.mascotJump}
          fallbackSrc="/brand/megadeal-elephant.svg"
          alt=""
          width={300}
          height={340}
          className="absolute -bottom-6 right-2 hidden h-auto w-[150px] opacity-[0.18] lg:block xl:right-10 xl:w-[190px]"
        />
        <div className={`${shell} relative z-10`}>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ffb3dd]">
                For local businesses
              </p>
              <h2
                className={`${fredoka.className} mt-2 max-w-[620px] text-2xl font-bold leading-tight sm:text-3xl`}
              >
                Fill quiet times. Grow local customers.
              </h2>
              <p className="mt-2.5 max-w-[620px] text-[15px] leading-6 text-white/85 lg:text-base">
                Get in before we launch and your first months of advertising are on us. Once deals
                go live the offer closes, so the businesses that join now are the ones customers
                see on day one.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
                {businessBenefits.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] font-semibold leading-6">
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
                <span className="text-sm font-semibold text-white/75">
                  Takes about 60 seconds · No credit card
                </span>
              </div>
              {stats && stats.merchantCount > 0 && (
                <p className="mt-4 text-sm font-semibold text-[#ffb3dd]">
                  {stats.merchantCount.toLocaleString()} Auckland businesses have already signed up.
                </p>
              )}
            </div>

            <div className="rounded-[24px] bg-white/10 p-6 ring-1 ring-inset ring-white/15 sm:p-7">
              <p className={`${fredoka.className} text-xl font-bold sm:text-2xl`}>
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
                    className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-white/80">{label}</dt>
                    <dd className="shrink-0 font-extrabold">{value}</dd>
                  </div>
                ))}
              </dl>
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
