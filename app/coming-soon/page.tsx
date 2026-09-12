import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";
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
  "MegaDeal is launching in Auckland first. Deal hunters can join for launch updates, while eligible local businesses can claim up to 6 months free advertising with 0% commission.";

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
 * the hero uses it instead of AucklandSkylineArt — no code change needed.
 * This page is statically prerendered, so the lookup runs once at build
 * time on Node, never in the Workers runtime.
 */
function findHeroPhoto(): string | null {
  const dir = path.join(process.cwd(), "public", "images");
  for (const ext of ["avif", "webp", "jpg", "jpeg", "png"]) {
    const file = `auckland-hero.${ext}`;
    try {
      if (fs.existsSync(path.join(dir, file))) return `/images/${file}`;
    } catch {
      // public/images may not exist yet — fall through to the illustration.
    }
  }
  return null;
}

const heroPhoto = findHeroPhoto();

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

export default function ComingSoonPage() {
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
      <section className="relative overflow-hidden bg-[#650fc7] text-white">
        <div
          className={`${shell} grid items-center gap-6 py-7 sm:gap-10 sm:py-12 lg:min-h-[590px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-14`}
        >
          <div className="lg:max-w-[640px]">
            <div className="inline-flex rounded-full bg-[#e81ea3] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-sm sm:px-5 sm:text-sm">
              Launching first in Auckland
            </div>
            <h1
              className={`${fredoka.className} mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:mt-5 lg:text-5xl`}
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
          </div>

          <div className="relative mx-auto w-full max-w-[720px] pb-3 pr-2 sm:pb-8 sm:pr-7 lg:pt-2">
            <div className="relative rotate-[1.5deg]">
              {/* Much shallower on phones. At 1.22:1 this illustration was
                  ~390px of an 844px viewport — nearly half the first
                  screen — which pushed both audience CTAs below the fold.
                  It's decorative, so on mobile it becomes a banner. */}
              <div
                className="relative aspect-[1.9/1] overflow-hidden border-[4px] border-white/80 bg-white/10 shadow-2xl sm:aspect-[1.28/1] lg:border-[5px] lg:shadow-[0_30px_80px_rgba(27,5,72,.34)]"
                style={{ clipPath: "polygon(7% 0, 100% 0, 94% 100%, 0 100%)", borderRadius: "28px" }}
              >
                {heroPhoto ? (
                  <img
                    src={heroPhoto}
                    alt="Auckland city and harbour"
                    className="h-full w-full -rotate-[1.5deg] scale-[1.08] object-cover"
                    fetchPriority="high"
                  />
                ) : (
                  <AucklandSkylineArt
                    shape="fill"
                    className="h-full w-full -rotate-[1.5deg] scale-[1.08] object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#241044]/16 via-transparent to-transparent" />
                <div className="absolute right-3 top-3 -rotate-[1.5deg] rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#650fc7] shadow-sm sm:right-7 sm:top-6 sm:px-5 sm:py-2 sm:text-sm sm:tracking-[0.13em]">
                  Auckland first
                </div>
                <div className="absolute bottom-3 left-4 hidden -rotate-[1.5deg] max-w-[70%] rounded-[14px] bg-[#321373]/92 px-4 py-3 text-white shadow-lg backdrop-blur-sm sm:bottom-6 sm:left-8 sm:block sm:max-w-[390px] sm:rounded-[18px] sm:px-6 sm:py-4">
                  <p className={`${fredoka.className} text-base font-bold sm:text-xl sm:font-black`}>
                    Same city. More to discover.
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/85 sm:mt-1 sm:text-sm">
                    Local offers. Local businesses. Better value.
                  </p>
                </div>
              </div>
            </div>

            <img
              src="/brand/deal-hunter-elephant.svg"
              alt="MegaDeal deal-hunter elephant holding a magnifying glass and a big deals tag"
              width={360}
              height={280}
              className="pointer-events-none absolute -bottom-5 -right-4 z-30 w-[155px] select-none drop-shadow-xl sm:-right-8 sm:w-[185px] lg:-bottom-3 lg:w-[245px] lg:drop-shadow-[0_18px_24px_rgba(38,8,87,.28)] 2xl:w-[275px]"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      {/*
        Two audience cards — the page's "which are you?" fork.

        Each is a single link rather than a card containing a button, so
        the whole tile is one large tap target and the inner pill is a
        <span>. On phones they collapse to a compact row (icon, question,
        one-line action) because at full height the business CTA sat 1.4
        screens down on an iPhone 13 — a visitor saw the pitch and the
        illustration, but no choice at all, in the first screen.
      */}
      <section className={`${shell} relative z-20 pt-4 sm:pt-6 lg:-mt-7 lg:pt-0`}>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:gap-5">
          <a
            href="#launch-updates"
            className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#e81ea3]/40 sm:items-center sm:gap-5 sm:rounded-[22px] sm:p-5 lg:min-h-[190px] lg:rounded-[24px] lg:p-7 lg:shadow-[0_18px_42px_rgba(40,7,88,.14)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe1f2] text-[#e81ea3] sm:h-12 sm:w-12 lg:h-16 lg:w-16">
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
              <span className="mt-0.5 block text-[13px] font-extrabold text-[#e81ea3] sm:mt-4 sm:inline-flex sm:h-11 sm:items-center sm:rounded-full sm:bg-[#e81ea3] sm:px-6 sm:text-sm sm:text-white sm:transition sm:group-hover:bg-[#c7128a]">
                Get launch updates →
              </span>
            </span>
          </a>

          <Link
            href="/list-your-business"
            className="group flex items-center gap-3.5 rounded-[18px] border border-[#eee7f6] bg-white p-4 shadow-[0_12px_32px_rgba(40,7,88,.10)] transition hover:border-[#650fc7]/40 sm:items-center sm:gap-5 sm:rounded-[22px] sm:p-5 lg:min-h-[190px] lg:rounded-[24px] lg:p-7 lg:shadow-[0_18px_42px_rgba(40,7,88,.14)]"
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
              <span className="mt-0.5 block text-[13px] font-extrabold text-[#650fc7] sm:mt-4 sm:inline-flex sm:h-11 sm:items-center sm:rounded-full sm:bg-[#650fc7] sm:px-6 sm:text-sm sm:text-white sm:transition sm:group-hover:bg-[#530fa1]">
                <span className="sm:hidden">Up to 6 months free →</span>
                <span className="hidden sm:inline">Claim my free advertising →</span>
              </span>
            </span>
          </Link>
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
        <div className="rounded-[22px] bg-[#4d0ca8] px-5 py-7 text-white shadow-[0_16px_40px_rgba(69,16,141,.12)] sm:px-8 sm:py-8 lg:rounded-[26px]">
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e81ea3] text-sm font-extrabold">
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
            // Before launch these tiles must NOT go to /category/*. Those
            // pages render the full launched-site chrome (search, city
            // picker, category nav) above an empty "No deals ... yet" grid
            // — exactly what the coming-soon gate exists to hide — so the
            // most eye-catching block on the page was quietly leaking
            // visitors out of the funnel into a dead end. Point them at the
            // launch-updates form instead, which is what someone browsing
            // categories pre-launch actually wants.
            const live = SITE_LAUNCHED && hasCategoryPage;
            return (
            <Link
              key={name}
              href={live ? `/category/${encodeURIComponent(name)}` : "#launch-updates"}
              aria-label={live ? `${name} deals` : `${name} — get notified when MegaDeal launches`}
              className="group overflow-hidden rounded-[18px] border border-[#e9e6f0] bg-white shadow-[0_8px_22px_rgba(28,18,54,.08)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(28,18,54,.12)]"
            >
              {/* The photo is left completely clear — nothing is drawn on
                  top of it. The large icon sits BEHIND the image, so it is
                  invisible whenever the photo loads and becomes a
                  deliberate-looking brand swatch if the photo ever fails,
                  instead of a broken-image box. */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f4efff] to-[#e7d9ff]">
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center text-[#c3aaf0]"
                >
                  <Icon className="h-9 w-9" />
                </span>
                {/* A CSS background rather than an <img>: these are remote
                    photos we don't control, and a failed <img> paints the
                    browser's broken-image glyph in the corner — on all six
                    tiles at once — whereas a failed background simply isn't
                    painted, leaving the swatch and icon above looking
                    intentional. Decorative either way, so nothing is lost
                    from the accessibility tree. */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
                  style={{ backgroundImage: `url("${image}")` }}
                />
              </div>

              {/* Icon lives here instead: its own chip, with predictable
                  contrast, rather than floating over whatever the photo
                  happens to contain. */}
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

      {/* ------------------------------------- Signup + business benefits */}
      <section className={`${shell} pb-8 lg:pb-9`}>
        <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
          <div
            id="launch-updates"
            className="scroll-mt-24 rounded-[24px] bg-[#fff0f7] px-5 py-7 sm:px-8 lg:min-h-[330px] lg:px-10 lg:py-9"
          >
            <h2
              className={`${fredoka.className} max-w-[520px] text-2xl font-bold leading-tight text-[#18122d] sm:text-3xl`}
            >
              Be first in line for launch deals
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-slate-600 lg:mt-3">
              Get early access to the best local offers in Auckland.
            </p>
            <div className="mt-4 max-w-[560px] lg:mt-5">
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                buttonLabel="Get launch updates →"
                accent="ember"
                surface="plain"
                layout="stacked"
              />
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f3edff] px-5 py-7 sm:px-8 lg:min-h-[330px] lg:px-10 lg:py-9">
            <h2
              className={`${fredoka.className} max-w-[550px] text-2xl font-bold leading-tight text-[#18122d] sm:text-3xl`}
            >
              Fill quiet times. Grow local customers.
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-slate-600 lg:mt-3">
              Join before launch and be part of something big in Auckland.
            </p>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4 lg:mt-6 lg:gap-y-5">
              {businessBenefits.map((item) => (
                <Tick key={item}>{item}</Tick>
              ))}
            </ul>
            <Link
              href="/list-your-business"
              className="mt-5 inline-flex h-12 items-center rounded-full bg-[#6d24dc] px-7 text-sm font-extrabold text-white transition hover:bg-[#530fa1] lg:mt-6"
            >
              Claim my free advertising →
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Launch plan */}
      <section className={`${shell} pb-10 lg:pb-14`}>
        <div className="flex flex-col gap-5 rounded-[22px] bg-[#f5f7fb] px-5 py-6 ring-1 ring-[#e5e8ef] sm:px-7 lg:min-h-[120px] lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc]">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className={`${fredoka.className} text-xl font-bold text-[#18122d] sm:text-2xl`}>
                Our launch plan
              </h2>
              <p className="mt-1 text-[15px] text-slate-500">Auckland first, then more Kiwi cities.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-extrabold text-[#1f1836] lg:justify-end lg:gap-x-7 lg:gap-y-3 lg:text-[15px]">
            <span className="text-[#e81ea3]">Auckland • first</span>
            {launchCities.map((cityName) => (
              <span key={cityName}>{cityName}</span>
            ))}
          </div>
        </div>
        {/* The page makes a prominent "up to 6 months advertising free*"
            claim in three places, so the asterisk has to actually resolve
            to the conditions rather than dead-ending as grey text. */}
        <p className="mt-4 text-[11px] text-slate-400">
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
