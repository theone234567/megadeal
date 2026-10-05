import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import {
  CalendarIcon,
  ClockIcon,
  CompassIcon,
  LeafIcon,
  MapPinIcon,
  MegaphoneIcon,
  PercentIcon,
  SparklesIcon,
  SuitcaseIcon,
  TicketIcon,
  UnlockIcon,
  UsersIcon,
} from "@/components/icons";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { currentPromo } from "@/lib/promo";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

/**
 * /advertise/things-to-do — the Things To Do pack (4 Oct 2026), consolidated
 * (5 Oct 2026) so each idea appears once: hero, category links, one value
 * section, the business types with their deal ideas, how it works, why
 * MegaDeal with the launch offer, FAQ, closing CTA. Still a scoped page
 * rather than a shared template, so the other advertise pages can't change
 * by accident.
 *
 * The offer follows the site's launch state (SITE_LAUNCHED, lib/promo.ts):
 * before launch, up to 6 months and "starts when MegaDeal goes live";
 * after it, the launch offer, with no pre-launch wording left behind.
 */

const LAUNCHED = SITE_LAUNCHED;
const PROMO = currentPromo(LAUNCHED);
const OFFER = `Up to ${PROMO.months} months free advertising`;
const CTA_LABEL = "Claim my free advertising";

const TITLE = "Activity & Experience Advertising Auckland";
const DESCRIPTION =
  "Promote your Auckland tours, activities and experiences with MegaDeal. Reach local customers, pay 0% commission and get the launch advertising offer.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/advertise/things-to-do` },
  openGraph: {
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
    url: `${SITE_URL}/advertise/things-to-do`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
  },
};

// The shared business signup (both /list-your-business designs keep the
// form at #signup). The promo field there is pre-filled with the current
// offer's code, so nothing needs passing in the link.
const SIGNUP_HREF = "/list-your-business#signup";
const TERMS_HREF = "/terms#businesses";

// Photos from the owner's "Things To Do Web Images" pack (4 Oct 2026):
// AI-generated illustrative scenes, not verified businesses or places
// (docs/THINGS-TO-DO-IMAGES.md). Alt text as supplied in its manifest.
const IMG = "/images/advertise/things-to-do";
const HERO_PHOTO = {
  src: `${IMG}/hero-kayaking-v1.webp`, // 1536×1024
  small: `${IMG}/hero-kayaking-v1-768.webp`, // 768×512, for phones
  alt: "Kayakers paddling on calm coastal water",
  position: "50% 50%",
};
const HERO_MASCOT = { src: "/megadeal/coming-soon-v2/mascot-hoodie.webp" };

/** One card per kind of activity business, matching the pills: what suits
 *  MegaDeal, and three deal ideas for it. The only place these photos
 *  appear on the page. */
const CATEGORIES = [
  {
    id: "tours-sightseeing",
    title: "Tours & Sightseeing",
    icon: CompassIcon,
    image: { src: `${IMG}/tours-sightseeing-v1.webp`, alt: "A guide showing a harbour viewpoint to visitors" },
    body: "Promote selected guided tours, sightseeing experiences or quieter departures to Auckland locals looking to explore more of their city.",
    ideas: ["Midweek tour", "Small-group package", "Selected departure"],
  },
  {
    id: "adventure-outdoors",
    title: "Adventure & Outdoors",
    icon: LeafIcon,
    image: { src: `${IMG}/adventure-outdoors-v1.webp`, alt: "Cyclists riding along a scenic coastal trail" },
    body: "Promote selected kayaking, cycling, climbing or outdoor sessions while keeping your busiest periods at their usual price.",
    ideas: ["Activity for two", "Introductory session", "Quiet weekday"],
  },
  {
    id: "indoor-activities",
    title: "Indoor Activities",
    icon: TicketIcon,
    image: { src: `${IMG}/indoor-activities-v1.webp`, alt: "Friends enjoying an indoor bowling activity" },
    body: "Use selected bowling, escape room, mini golf or other indoor sessions to attract more customers during quieter times.",
    ideas: ["Midweek group offer", "Selected session", "Activity + extra"],
  },
  {
    id: "family-experiences",
    title: "Family Experiences",
    icon: UsersIcon,
    image: { src: `${IMG}/family-experiences-v1.webp`, alt: "A family playing mini golf together" },
    body: "Create a clear family package around selected dates or sessions and explain exactly who and what is included.",
    ideas: ["Family package", "Parent + child", "Selected-date offer"],
  },
  {
    id: "workshops-classes",
    title: "Workshops & Classes",
    icon: SparklesIcon,
    image: { src: `${IMG}/workshops-classes-v1.webp`, alt: "Adults learning pottery in a creative workshop" },
    body: "Introduce locals to pottery, cooking, art or another hands-on activity with a simple introductory experience.",
    ideas: ["Beginner workshop", "Class for two", "Selected-date class"],
  },
  {
    id: "cruises-day-trips",
    title: "Cruises & Day Trips",
    icon: SuitcaseIcon,
    image: { src: `${IMG}/cruises-day-trips-v1.webp`, alt: "A passenger boat on a coastal sightseeing trip" },
    body: "Promote selected departures or available places while keeping control of confirmation, capacity and booking.",
    ideas: ["Weekday cruise", "Selected departure", "Day trip + extra"],
  },
];

/** The one section that makes the "quieter times" case. */
const VALUE_CARDS = [
  {
    icon: CalendarIcon,
    title: "Fill Quieter Sessions",
    body: "Use selected days, departures or sessions where you would genuinely like more customers.",
  },
  {
    icon: UsersIcon,
    title: "Reach More Locals",
    body: "Get discovered by Aucklanders looking for tours, activities and experiences close to home.",
  },
  {
    icon: ClockIcon,
    title: "Protect Your Busy Times",
    body: "Promote selected availability rather than discounting every session or every date.",
  },
  {
    icon: UnlockIcon,
    title: "Stay in Control",
    body: "You choose the offer, availability, booking requirements and conditions that suit your business.",
  },
] as const;

const STEPS = [
  { number: "1", title: "Join MegaDeal", body: "Create your business profile and tell customers what you offer." },
  { number: "2", title: "Create Your Deal", body: "Choose the experience, value, dates, availability and booking details." },
  {
    number: "3",
    title: "Customers Book Direct",
    body: "Customers discover your deal and contact or book with your business. You take payment directly.",
  },
] as const;

const BENEFITS = [
  {
    icon: PercentIcon,
    title: "0% Commission",
    body: "Customers pay your business directly. MegaDeal does not take a percentage of your sale.",
  },
  {
    icon: MapPinIcon,
    title: "Local Auckland Audience",
    body: "MegaDeal is launching in Auckland first and is designed to help locals discover businesses around them.",
  },
  {
    icon: MegaphoneIcon,
    title: `Up to ${PROMO.months} Months Free*`,
    body: "Eligible businesses can receive the current launch advertising offer.",
  },
  {
    icon: UnlockIcon,
    title: "You Stay in Control",
    body: "Choose your deals, availability and booking conditions.",
  },
] as const;

// Plain text: also the FAQPage JSON-LD below. Answers keep their earlier
// factual and legal meaning.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does it cost to advertise on MegaDeal?",
    a: LAUNCHED
      ? `Eligible new businesses can receive up to ${PROMO.months} months of free advertising. Offer terms and conditions apply.`
      : "Eligible Auckland businesses that join before launch can receive up to six months of free advertising. The promotional period starts when MegaDeal goes live to customers, not when you sign up. Offer terms and conditions apply.",
  },
  {
    q: "Does MegaDeal take commission?",
    a: "No. MegaDeal does not take a percentage of your sales. Customers book and pay your business directly. There is no lock-in contract.",
  },
  {
    q: "What types of activity businesses can join?",
    a: "MegaDeal is designed for eligible local tours, sightseeing experiences, outdoor adventures, indoor activities, family attractions, creative workshops, cruises and day trips. Your business and offers must meet the current eligibility requirements.",
  },
  {
    q: "Do I have to discount every session?",
    a: "No. Choose the experience, dates or sessions you want to promote. Your offer could be a discount, a package or a complimentary extra that provides genuine value. You do not need to discount your entire schedule.",
  },
  {
    q: "How do customers book and pay?",
    a: "Customers use the booking or contact options you provide, such as your booking website or phone number. You confirm availability and take payment directly. If your activity welcomes walk-ins, make that clear in the offer. Viewing a deal does not reserve a place.",
  },
  {
    q: "Can I choose the dates and availability?",
    a: "You decide which dates, sessions and availability apply to your offer. Explain any booking requirements and restrictions clearly. Manage confirmed bookings through your own process; MegaDeal does not automatically synchronise your booking calendar.",
  },
  {
    q: "What happens after the free advertising period?",
    // Top-ups are arranged with us for now: no purchase screen in the
    // portal yet (same wording as /list-your-business).
    a: "You can choose whether to continue advertising using pay-as-you-go credits. We’ll confirm the cost with you before you buy any. There is no lock-in contract.",
  },
  {
    q: "What businesses are currently eligible?",
    a: "MegaDeal is launching in Auckland first and currently accepts New Zealand registered limited companies. Sole traders and partnerships are not currently eligible. E-commerce retail and adult businesses are not eligible. Eligible local activity businesses can use their own websites for bookings and payments. Applications and offers remain subject to the existing eligibility and approval process.",
  },
];

const H2 = `${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`;
const EYEBROW = "text-xs font-bold uppercase tracking-wider";
const INK = { color: "#0F172A" };
const MUTED = { color: "#475569" };
const PURPLE = { color: "#6520B5" };
const LINE = { borderColor: "#E8E1EF" };
const ICON_CIRCLE = { backgroundColor: "#F5EFFC", color: "#6520B5" };
const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-center text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2";

export default function ThingsToDoAdvertisingPage() {
  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName="advertise_things_to_do" />
      {/* The service this page offers; no offer markup or prices. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Activity and experience advertising",
            name: `${SITE_NAME} activity & experience advertising`,
            description:
              "Zero-commission advertising for Auckland tours, outdoor adventures, indoor activities, family experiences, workshops, cruises and day trips. Customers book and pay the business directly.",
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            audience: {
              "@type": "BusinessAudience",
              audienceType:
                "Tour operators, outdoor adventure businesses, indoor activity venues, family attractions, workshops and classes, cruise and day-trip operators",
            },
            url: `${SITE_URL}/advertise/things-to-do`,
          }),
        }}
      />

      <a
        href="#things-to-do-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6520B5] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id="things-to-do-main">
        {/* 1 — Hero: lavender rounded panel, text left, photo right with the
            mascot at its lower edge. */}
        <section id="hero" className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-5 py-7 sm:rounded-3xl sm:px-9 sm:py-10 md:grid-cols-[1.12fr_1fr] md:gap-8 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-hp-purple">
                For Auckland activity &amp; experience businesses
              </p>
              <h1
                className={`${fredoka.className} mt-3 text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-hp-ink [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]`}
              >
                Fill quiet times.{" "}
                <span className="block text-hp-purple">Welcome more local adventurers.</span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed sm:text-lg md:text-base lg:text-lg" style={{ color: "#334155" }}>
                Put your tours, activities and experiences in front of Auckland locals looking for
                their next day out. You choose the offer, dates and availability. Customers book and
                pay you directly.
              </p>
              <p className={`${fredoka.className} mt-5 text-xl font-semibold text-hp-purple sm:text-2xl`}>{OFFER}*</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a href={SIGNUP_HREF} data-cta-section="hero" className={`w-full sm:w-auto ${PRIMARY_BUTTON}`}>
                  {CTA_LABEL} <span aria-hidden>→</span>
                </a>
                <a
                  href="#how-it-works"
                  data-cta-section="hero_secondary"
                  className="inline-flex min-h-11 items-center text-base font-bold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                >
                  See how it works
                </a>
              </div>

              <p className="mt-5 flex flex-wrap gap-x-1.5 gap-y-1 text-sm font-semibold text-hp-ink">
                <span className="whitespace-nowrap">0% commission</span>
                <span aria-hidden className="text-hp-muted">·</span>
                <span className="whitespace-nowrap">No lock-in</span>
                <span aria-hidden className="text-hp-muted">·</span>
                <span className="whitespace-nowrap">No credit card required</span>
              </p>
              <p className="mt-2 text-xs" style={MUTED}>
                *{LAUNCHED ? "For eligible new businesses." : "For eligible businesses that join before launch."}{" "}
                <Link href={TERMS_HREF} className="font-semibold text-hp-purple underline underline-offset-2 hover:no-underline">
                  Terms apply.
                </Link>
                {!LAUNCHED && " Your free advertising starts when MegaDeal goes live."}
              </p>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
                <picture>
                  <source media="(min-width: 640px)" srcSet={HERO_PHOTO.src} width={1536} height={1024} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_PHOTO.small}
                    alt={HERO_PHOTO.alt}
                    width={768}
                    height={512}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: HERO_PHOTO.position }}
                  />
                </picture>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_MASCOT.src}
                  alt=""
                  width={480}
                  height={496}
                  decoding="async"
                  className="pointer-events-none absolute bottom-0 right-[4%] h-auto w-[104px] translate-y-1/2 sm:w-[140px] md:w-[110px] lg:w-[160px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Category pills: down to each kind of business below. Swipe on
            phones, wrap on wider screens. */}
        <nav aria-label="Activity & experience categories" className="border-b bg-white" style={LINE}>
          <div className="mx-auto max-w-[1240px] overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            <ul className="flex w-max min-w-full items-center gap-2.5 sm:w-auto sm:flex-wrap">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#6520B5]/40 hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                    style={{ ...LINE, ...INK }}
                  >
                    <c.icon className="h-4 w-4 text-[#6520B5]" />
                    {c.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* 3 — The value of promoting quieter times, made once. */}
        <section aria-labelledby="value-heading" className="bg-white px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1040px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Smarter local promotion
            </p>
            <h2 id="value-heading" className={H2} style={INK}>
              Turn quieter sessions into new customers.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={MUTED}>
              A spare seat on a tour or an unfilled session cannot be sold once the time has passed.
              MegaDeal gives Auckland activity businesses another way to promote selected times while
              keeping control of their busiest dates.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 sm:gap-5">
              {VALUE_CARDS.map((c) => (
                <div key={c.title} className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm sm:p-6" style={LINE}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={ICON_CIRCLE}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className={`${fredoka.className} text-lg font-semibold`} style={INK}>
                      {c.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 — Business types and deal ideas: one card per pill above. */}
        <section aria-labelledby="categories-heading" className="bg-hp-lavender px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="categories-heading" className={H2} style={INK}>
                Built for Things To Do businesses.
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={MUTED}>
                From tours and family attractions to workshops and outdoor adventures, create an offer
                around the times and experiences that make sense for your business.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => (
                <article key={c.id} id={c.id} className="flex scroll-mt-[100px] flex-col overflow-hidden rounded-xl border bg-white" style={LINE}>
                  <div className="relative aspect-[3/2] w-full">
                    <Image
                      src={c.image.src}
                      alt={c.image.alt}
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className={`${fredoka.className} text-xl font-semibold`} style={INK}>
                      {c.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={MUTED}>
                      {c.body}
                    </p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wide" style={MUTED}>
                      Deal ideas
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {c.ideas.map((idea) => (
                        <li key={idea} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: "#F5EFFC", color: "#4A1786" }}>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-center text-xs" style={MUTED}>
              Deal ideas are examples only. Each participating business chooses its own offer,
              availability and applicable conditions.
            </p>
          </div>
        </section>

        {/* 5 — How it works (header nav: #how-it-works) */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-[100px] bg-white px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Simple. Direct. Local.
            </p>
            <h2 id="how-heading" className={H2} style={INK}>
              How MegaDeal works.
            </h2>

            <ol className="mt-8 grid grid-cols-1 gap-8 text-left sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.number}>
                  <span
                    aria-hidden
                    className={`${fredoka.className} flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold`}
                    style={{ backgroundColor: "#F1EBFB", color: "#6520B5" }}
                  >
                    {s.number}
                  </span>
                  <h3 className={`${fredoka.className} mt-3 text-lg font-semibold`} style={INK}>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>

            <a href={SIGNUP_HREF} data-cta-section="how_it_works" className={`mt-9 w-full sm:w-auto ${PRIMARY_BUTTON}`}>
              {CTA_LABEL} <span aria-hidden>→</span>
            </a>
          </div>
        </section>

        {/* 6 — Why MegaDeal and the launch offer, together (header nav:
            #why-megadeal; header CTA and older links: #launch-offer). */}
        <section id="why-megadeal" aria-labelledby="why-heading" className="scroll-mt-[100px] bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-3xl bg-hp-lavender px-5 py-10 sm:px-10 sm:py-12">
            <div className="text-center">
              <p className={EYEBROW} style={PURPLE}>
                Why MegaDeal
              </p>
              <h2 id="why-heading" className={H2} style={INK}>
                More local customers. No commission on your sales.
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((w) => (
                <div key={w.title} className="rounded-xl border bg-white p-5" style={LINE}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={ICON_CIRCLE}>
                    <w.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-3 text-lg font-semibold`} style={INK}>
                    {w.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>

            <div id="launch-offer" className="mx-auto mt-8 max-w-2xl scroll-mt-[100px] rounded-2xl border bg-white px-5 py-7 text-center sm:px-8" style={LINE}>
              <h3 className={`${fredoka.className} text-2xl font-semibold leading-tight [text-wrap:balance]`} style={INK}>
                {LAUNCHED ? "Get your business in front of Auckland." : "Get ready for Auckland’s launch."}
              </h3>
              <p className={`${fredoka.className} mt-2 text-xl font-semibold`} style={PURPLE}>
                {OFFER}*
              </p>
              <a href={SIGNUP_HREF} data-cta-section="launch_offer" className={`mt-5 w-full sm:w-auto ${PRIMARY_BUTTON}`}>
                {CTA_LABEL} <span aria-hidden>→</span>
              </a>
              <p className="mt-3 text-sm font-semibold" style={INK}>
                0% commission · No lock-in · No credit card required to sign up
              </p>
              <p className="mt-3 text-xs leading-relaxed" style={MUTED}>
                *Launch offer code {PROMO.code}.{" "}
                {LAUNCHED
                  ? "For eligible Auckland businesses."
                  : "For eligible Auckland businesses applying before launch; your free advertising starts when MegaDeal goes live."}{" "}
                Current eligibility requires a New Zealand registered limited company. Subject to
                approval and fair use.{" "}
                <Link href={TERMS_HREF} className="font-semibold underline hover:no-underline" style={PURPLE}>
                  View offer terms.
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* 7 — FAQ (header nav: #questions) */}
        <section id="questions" aria-labelledby="faq-heading" className="scroll-mt-[100px] bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq-heading" className={`${fredoka.className} text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
              Frequently asked questions
            </h2>

            <div className="mt-7 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} name="things-to-do-faq" data-faq-question={f.q} className="group rounded-xl border bg-white p-5" style={LINE}>
                  <summary className="cursor-pointer list-none font-bold marker:content-none" style={INK}>
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={MUTED}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-7 text-center text-sm" style={MUTED}>
              Have a question about your activity business?{" "}
              <Link href="/contact" className="font-bold hover:underline" style={PURPLE}>
                Talk to the MegaDeal team
              </Link>
            </p>

            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: safeJsonLd({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: FAQS.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              }}
            />
          </div>
        </section>

        {/* 8 — Closing CTA: the hero's lavender panel, kept short. */}
        <section aria-labelledby="final-heading" className="bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-6 py-10 text-center sm:rounded-3xl sm:px-12">
            <h2 id="final-heading" className={`${fredoka.className} mx-auto max-w-2xl text-[26px] font-semibold leading-tight text-hp-ink [text-wrap:balance] sm:text-[32px]`}>
              Ready to fill quieter sessions?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={MUTED}>
              Join MegaDeal and give more Auckland locals a reason to discover your business.
            </p>
            <a href={SIGNUP_HREF} data-cta-section="final_cta" className={`mt-6 w-full sm:w-auto ${PRIMARY_BUTTON}`}>
              {CTA_LABEL} <span aria-hidden>→</span>
            </a>
            <p className="mt-4 text-sm font-semibold text-hp-ink">
              0% commission · Customers book directly ·{" "}
              <Link href={TERMS_HREF} className="text-hp-purple underline underline-offset-2 hover:no-underline">
                Terms apply
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
