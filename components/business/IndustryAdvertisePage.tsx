import type { ComponentType } from "react";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import { MapPinIcon, MegaphoneIcon, PercentIcon, UnlockIcon } from "@/components/icons";
import { ORGANIZATION_ID, SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { currentPromo } from "@/lib/promo";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

/**
 * The advertise page for one customer category (Travel & Getaways, Health &
 * Fitness), laid out like /advertise/things-to-do: hero, business-type
 * links, the "quieter times" case, the business types with deal ideas, how
 * it works, why MegaDeal with the offer, FAQ, closing CTA. Only the newer
 * pages use this; the four older ones keep their own code, so nothing here
 * can change them.
 *
 * The offer follows the site's launch state (SITE_LAUNCHED, lib/promo.ts),
 * as on the other pages: before launch, up to 6 months, starting when
 * MegaDeal goes live; after it, the launch offer, with no pre-launch
 * wording left behind.
 */

type Icon = ComponentType<{ className?: string }>;

export interface IndustryPageContent {
  /** Path of the page, e.g. "/advertise/travel-getaways". */
  path: string;
  /** Meta pixel content name. */
  trackingName: string;
  /** Hero label, part of the H1: "… advertising in Auckland". */
  audience: string;
  headline: string;
  headlineAccent: string;
  intro: string;
  heroPhoto: { src: string; alt: string; width: number; height: number };
  /** The kinds of business, each with what suits MegaDeal and deal ideas. */
  types: { id: string; title: string; icon: Icon; body: string; ideas: string[] }[];
  typesNavLabel: string;
  typesHeading: string;
  typesIntro: string;
  value: { eyebrow: string; heading: string; body: string; cards: { icon: Icon; title: string; body: string }[] };
  /** Step 2 and 3 of "How MegaDeal works". */
  createStep: string;
  bookStep: { title: string; body: string };
  /** Category FAQs, shown after cost and commission; the shared ones close. */
  faqs: { q: string; a: string }[];
  /** The section headings, in the category's own words: identical
   *  headings on every advertise page made them read as one template to
   *  search engines (SEO pack T20). */
  headings: { how: string; why: string; faq: string };
  /** Fills "Eligible local … can use their own websites for bookings and payments." */
  eligibleNoun: string;
  service: { type: string; description: string; audience: string };
  contactPrompt: string;
  finalHeading: string;
}

const LAUNCHED = SITE_LAUNCHED;
const PROMO = currentPromo(LAUNCHED);
const OFFER = `Up to ${PROMO.months} months free advertising`;
const CTA_LABEL = "Claim my free advertising";

// The shared business signup; its promo field is pre-filled with the
// current offer's code.
const SIGNUP_HREF = "/list-your-business#signup";
const TERMS_HREF = "/terms#businesses";
const MASCOT = "/megadeal/coming-soon-v2/mascot-hoodie.webp";

const H2 = `${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`;
const EYEBROW = "text-xs font-bold uppercase tracking-wider";
const INK = { color: "#0F172A" };
const MUTED = { color: "#475569" };
const PURPLE = { color: "#6D28D9" };
const LINE = { borderColor: "#E8E1EF" };
const ICON_CIRCLE = { backgroundColor: "#F5EFFC", color: "#6D28D9" };
const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-center text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2";

/** Cost, commission, after the free period and eligibility: the same
 *  answers, word for word, as the other advertise pages. */
function sharedFaqs(eligibleNoun: string) {
  return {
    first: [
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
    ],
    last: [
      {
        q: "What happens after the free advertising period?",
        a: "You can choose whether to continue advertising using pay-as-you-go credits. We’ll confirm the cost with you before you buy any. There is no lock-in contract.",
      },
      {
        q: "What businesses are currently eligible?",
        a: `${LAUNCHED ? "MegaDeal is live in Auckland and currently accepts" : "MegaDeal is launching in Auckland first and currently accepts"} New Zealand registered limited companies. Sole traders and partnerships are not currently eligible. E-commerce retail and adult businesses are not eligible. Eligible local ${eligibleNoun} can use their own websites for bookings and payments. Applications and offers remain subject to the existing eligibility and approval process.`,
      },
    ],
  };
}

export default function IndustryAdvertisePage({ content: c }: { content: IndustryPageContent }) {
  const shared = sharedFaqs(c.eligibleNoun);
  const faqs = [...shared.first, ...c.faqs, ...shared.last];
  const steps = [
    { number: "1", title: "Join MegaDeal", body: "Create your business profile and tell customers what you offer." },
    { number: "2", title: "Create Your Deal", body: c.createStep },
    { number: "3", ...c.bookStep },
  ];
  const benefits = [
    { icon: PercentIcon, title: "0% Commission", body: "Customers pay your business directly. MegaDeal does not take a percentage of your sale." },
    {
      icon: MapPinIcon,
      title: "Local Auckland Audience",
      body: LAUNCHED
        ? "MegaDeal is live in Auckland and is designed to help locals discover businesses around them."
        : "MegaDeal is launching in Auckland first and is designed to help locals discover businesses around them.",
    },
    { icon: MegaphoneIcon, title: `Up to ${PROMO.months} Months Free*`, body: "Eligible businesses can receive the current launch advertising offer." },
    { icon: UnlockIcon, title: "You Stay in Control", body: "Choose your deals, availability and booking conditions." },
  ];
  const mainId = `${c.trackingName}-main`;

  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName={c.trackingName} />
      {/* The service this page offers; no offer markup or prices. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: c.service.type,
            name: `${SITE_NAME} ${c.service.type.toLowerCase()}`,
            description: c.service.description,
            provider: { "@id": ORGANIZATION_ID, "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            audience: { "@type": "BusinessAudience", audienceType: c.service.audience },
            url: `${SITE_URL}${c.path}`,
          }),
        }}
      />

      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6D28D9] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id={mainId}>
        {/* Hero: lavender panel, text left, photo right with the mascot at
            its lower edge. */}
        <section id="hero" className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-5 py-7 sm:rounded-3xl sm:px-9 sm:py-10 md:grid-cols-[1.12fr_1fr] md:gap-8 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-12">
            <div>
              {/* The small label is part of the heading, as on Home & Car:
                  the big line alone says nothing about what the page is,
                  and the page's one heading is what search engines and AI
                  answers lean on most after the title (SEO pack T11). */}
              <h1>
                <span className="block text-xs font-bold uppercase tracking-[0.08em] text-hp-purple">{c.audience}</span>{" "}
                <span
                  className={`${fredoka.className} mt-3 block text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-hp-ink [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]`}
                >
                  {c.headline} <span className="block text-hp-purple">{c.headlineAccent}</span>
                </span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed sm:text-lg md:text-base lg:text-lg" style={{ color: "#334155" }}>
                {c.intro}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.heroPhoto.src}
                  sizes="(min-width: 1280px) 548px, (min-width: 768px) 45vw, calc(100vw - 72px)"
                  alt={c.heroPhoto.alt}
                  width={c.heroPhoto.width}
                  height={c.heroPhoto.height}
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MASCOT}
                  srcSet="/megadeal/coming-soon-v2/mascot-hoodie-240.webp 240w, /megadeal/coming-soon-v2/mascot-hoodie.webp 480w"
                  sizes="(min-width: 1024px) 160px, (min-width: 768px) 110px, (min-width: 640px) 140px, 104px"
                  alt=""
                  width={480}
                  height={496}
                  loading="lazy"
                  decoding="async"
                  className="pointer-events-none absolute bottom-0 right-[4%] h-auto w-[104px] translate-y-1/2 sm:w-[140px] md:w-[110px] lg:w-[160px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Business-type pills: down to each kind of business below. Swipe on
            phones, wrap on wider screens. */}
        <nav aria-label={c.typesNavLabel} className="border-b bg-white" style={LINE}>
          <div className="mx-auto max-w-[1240px] overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            <ul className="flex w-max min-w-full items-center gap-2.5 sm:w-auto sm:flex-wrap">
              {c.types.map((t) => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#6D28D9]/40 hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                    style={{ ...LINE, ...INK }}
                  >
                    <t.icon className="h-4 w-4 text-[#6D28D9]" />
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* The value of promoting quieter times, made once. */}
        <section aria-labelledby="value-heading" className="bg-white px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1040px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              {c.value.eyebrow}
            </p>
            <h2 id="value-heading" className={H2} style={INK}>
              {c.value.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={MUTED}>
              {c.value.body}
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 sm:gap-5">
              {c.value.cards.map((v) => (
                <div key={v.title} className="flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm sm:p-6" style={LINE}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={ICON_CIRCLE}>
                    <v.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className={`${fredoka.className} text-lg font-semibold`} style={INK}>
                      {v.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                      {v.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Business types and deal ideas: one card per pill above. */}
        <section aria-labelledby="types-heading" className="bg-hp-lavender px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="types-heading" className={H2} style={INK}>
                {c.typesHeading}
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={MUTED}>
                {c.typesIntro}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.types.map((t) => (
                <article key={t.id} id={t.id} className="flex scroll-mt-[100px] flex-col rounded-xl border bg-white p-5 sm:p-6" style={LINE}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={ICON_CIRCLE}>
                    <t.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-3 text-xl font-semibold`} style={INK}>
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={MUTED}>
                    {t.body}
                  </p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide" style={MUTED}>
                    Deal ideas
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {t.ideas.map((idea) => (
                      <li key={idea} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: "#F5EFFC", color: "#4A1786" }}>
                        {idea}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-center text-xs" style={MUTED}>
              Deal ideas are examples only. Each participating business chooses its own offer,
              availability and applicable conditions.
            </p>
          </div>
        </section>

        {/* How it works (header nav: #how-it-works) */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-[100px] bg-white px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Simple. Direct. Local.
            </p>
            <h2 id="how-heading" className={H2} style={INK}>
              {c.headings.how}
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-8 text-left sm:grid-cols-3">
              {steps.map((s) => (
                <li key={s.number}>
                  <span
                    aria-hidden
                    className={`${fredoka.className} flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold`}
                    style={{ backgroundColor: "#F1EBFB", color: "#6D28D9" }}
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

        {/* Why MegaDeal and the launch offer, together (header nav:
            #why-megadeal; header CTA: #launch-offer). */}
        <section id="why-megadeal" aria-labelledby="why-heading" className="scroll-mt-[100px] bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-3xl bg-hp-lavender px-5 py-10 sm:px-10 sm:py-12">
            <div className="text-center">
              <p className={EYEBROW} style={PURPLE}>
                Why MegaDeal
              </p>
              <h2 id="why-heading" className={H2} style={INK}>
                {c.headings.why}
              </h2>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((w) => (
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
                Current eligibility requires a New Zealand registered limited company. Subject to approval and fair use.{" "}
                <Link href={TERMS_HREF} className="font-semibold underline hover:no-underline" style={PURPLE}>
                  View offer terms.
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ (header nav: #questions) */}
        <section id="questions" aria-labelledby="faq-heading" className="scroll-mt-[100px] bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 id="faq-heading" className={`${fredoka.className} text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
              {c.headings.faq}
            </h2>
            <div className="mt-7 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} name={`${c.trackingName}-faq`} data-faq-question={f.q} className="group rounded-xl border bg-white p-5" style={LINE}>
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
              {c.contactPrompt}{" "}
              <Link href="/contact" className="font-bold hover:underline" style={PURPLE}>
                Talk to the MegaDeal team
              </Link>
            </p>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: safeJsonLd({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
                }),
              }}
            />
          </div>
        </section>

        {/* Closing CTA: the hero's lavender panel, kept short. */}
        <section aria-labelledby="final-heading" className="bg-white px-4 pb-12 sm:px-6 sm:pb-14 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-6 py-10 text-center sm:rounded-3xl sm:px-12">
            <h2 id="final-heading" className={`${fredoka.className} mx-auto max-w-2xl text-[26px] font-semibold leading-tight text-hp-ink [text-wrap:balance] sm:text-[32px]`}>
              {c.finalHeading}
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
