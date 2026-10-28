import { Suspense } from "react";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MerchantSignupForm from "@/app/list-your-business/MerchantSignupForm";
import DealCard from "@/components/DealCard";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  PercentIcon,
  SuitcaseIcon,
  UsersIcon,
  UtensilsIcon,
  WrenchIcon,
} from "@/components/icons";
import { EXAMPLE_BURGER_DEAL } from "@/lib/exampleDeals";
import { businessPageCopy, OFFER_TERMS_HREF } from "@/lib/businessPageContent";
import { ADVERTISE_PAGES } from "@/lib/businessLinks";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/**
 * The redesigned /list-your-business (Business Page pack, 4 Oct 2026),
 * shown when LIST_BUSINESS_DESIGN is "v2" (lib/siteConfig.ts) and to
 * admins at /list-your-business?design=v2. The site's own header and
 * footer come from the root layout, so they appear exactly once.
 *
 * The signup is the existing form (MerchantSignupForm) in its redesigned
 * layout: same fields, same checks, same account and application flow.
 */

const BENEFIT_ICONS = [UsersIcon, CalendarIcon, PercentIcon];
const HERO_TICKS = ["0% commission", "No credit card", "No lock-in"];
// The category bar's icons (components/CategoryNav.tsx), by category slug.
const INDUSTRY_ICONS: Record<(typeof ADVERTISE_PAGES)[number]["slug"], typeof CompassIcon> = {
  "food-drink": UtensilsIcon,
  "beauty-spa": FlowerIcon,
  "things-to-do": CompassIcon,
  "travel-getaways": SuitcaseIcon,
  "health-fitness": DumbbellIcon,
  "home-car": WrenchIcon,
};


export default function BusinessLandingV2({ launched, businessCount = 0 }: { launched: boolean; businessCount?: number }) {
  const copy = businessPageCopy(launched);

  return (
    <main className="bg-white text-slate-900">
      <ConversionTracker />
      <ViewContentTracker contentName="list_your_business" />
      {/* Only what's on the page: the service, and the FAQ exactly as shown. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Local business advertising",
            name: `${SITE_NAME} business advertising`,
            description: copy.intro,
            provider: { "@id": ORGANIZATION_ID, "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            url: `${SITE_URL}/list-your-business`,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: copy.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />

      <div className="mx-auto w-full max-w-[1184px] px-5 sm:px-8">
        {/* Hero: the home page's purple card (components/PrelaunchHero.tsx),
            so the two pages people land on look like one site: white
            headline with its second line in light blue, a white button. */}
        <section
          aria-labelledby="business-title"
          className="relative isolate mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#7C3AED] via-hp-purple to-[#4C1D95] text-white sm:mt-7 sm:rounded-3xl"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F0ABFC]/20 blur-3xl" />
          <div className="relative grid items-center gap-8 px-5 py-7 sm:px-9 sm:py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:px-12 lg:py-12">
          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white">{copy.eyebrow}</p>
            <h1
              id="business-title"
              className="mt-3 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-white [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]"
            >
              {copy.headlineLead} <span className="block text-[#BAE6FD]">{copy.headlineAccent}</span>
            </h1>
            <p className="mt-4 text-xl font-bold text-white sm:text-2xl">{copy.subheading}</p>
            <p className="mt-2 text-base text-white/85 sm:text-lg">{copy.intro}</p>
            {/* The home page hero's round white ticks, with three things the
                page already promises (the intro and the sign-up list). */}
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 sm:gap-x-5">
              {HERO_TICKS.map((t) => (
                <li
                  key={t}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap font-display text-[0.9375rem] font-bold text-white sm:gap-2 sm:text-base"
                >
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-hp-purple">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <a
                href="#business-signup"
                data-cta-section="hero"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-bold text-hp-purple shadow-[0_8px_20px_rgba(33,26,53,0.25)] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hp-purple min-[360px]:whitespace-nowrap min-[400px]:px-7 sm:w-auto"
              >
                {copy.heroCta}
                <ArrowRightIcon className="h-4 w-4 shrink-0" />
              </a>
              {/* Businesses already on MegaDeal look for their way back in. */}
              <p className="text-center text-sm text-white/85 sm:text-left">
                Already listed?{" "}
                <Link href="/portal" className="font-semibold text-white underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </div>
            {/* Real, approved businesses only, and only once the number is
                worth showing (lib/publicStats.ts MIN_COUNT_TO_SHOW). */}
            {businessCount > 0 && (
              <p className="mt-4 text-sm font-semibold text-white">
                Join {businessCount.toLocaleString("en-NZ")} Auckland businesses already on {SITE_NAME}.
              </p>
            )}
            {/* The fine print on one short line (was three). */}
            <p className="mt-4 text-sm text-white/80">
              {copy.launchNote ? "Free before launch: 1 Everyday + 1 Flash Deal at a time. " : "For eligible businesses. "}
              Offers may change.{" "}
              <Link href={OFFER_TERMS_HREF} className="font-semibold text-white underline underline-offset-2">
                T&amp;Cs apply.
              </Link>
            </p>
          </div>

          {/* The real DealCard, as customers see it on the site, with
              example details: a card that can't drift from the real one.
              Not a link, and labelled as an example. */}
          {/* The mascot presents the example deal, as on the home page
              (components/PrelaunchHero.tsx): he and the card stand on one
              baseline, a soft shadow under his feet, his open hand held out
              to the card. On a phone the card is a little narrower so he
              stands beside it; from lg the card moves left to give him
              room. */}
          <figure className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:mr-16">
            <figcaption className="mb-2 text-center text-xs font-semibold text-white/80 sm:text-sm">
              Example deal — not available to redeem
            </figcaption>
            <div className="relative">
              <div aria-hidden className="pointer-events-none w-[80%] select-none rounded-2xl shadow-[0_22px_40px_-12px_rgba(33,26,53,0.45)] sm:w-full">
                <DealCard deal={EXAMPLE_BURGER_DEAL} preview priority />
              </div>
              <div aria-hidden="true" className="absolute -bottom-1 right-[2%] h-4 w-[26%] rounded-[50%] bg-[#1e0b3d]/45 blur-md sm:-right-12 sm:w-[110px] lg:-right-[1.75rem] lg:w-[92px] xl:-right-[4.5rem] xl:w-[110px]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/megadeal/mascot/megadeal-mascot-hero-240.webp"
                srcSet="/megadeal/mascot/megadeal-mascot-hero-240.webp 240w, /megadeal/mascot/megadeal-mascot-hero-380.webp 380w"
                sizes="(min-width: 640px) 150px, 120px"
                width={560}
                height={580}
                alt="MegaDeal’s elephant mascot"
                loading="eager"
                fetchPriority="low"
                decoding="async"
                className="absolute bottom-0 -right-[4%] h-auto w-[120px] select-none drop-shadow-[0_14px_22px_rgba(33,26,53,0.3)] sm:-right-[4.5rem] sm:w-[148px] lg:-right-[2.25rem] lg:w-[124px] xl:-right-[5.75rem] xl:w-[148px]"
              />
            </div>
          </figure>
          </div>
        </section>

        {/* Benefits */}
        {/* Benefits: white cards with the icon in a lavender tile, as the
            industry cards lower down. */}
        <ul className="grid gap-3 pt-6 sm:grid-cols-3 sm:gap-4 sm:pt-8">
          {copy.benefits.map(([title, text], i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] sm:p-5">
                <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <strong className="block text-base font-bold text-slate-900 sm:text-lg">{title}</strong>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">{text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Steps */}
        <section aria-labelledby="steps-title" className="mt-8 rounded-3xl bg-hp-lavender px-4 py-7 sm:mt-10 sm:px-8 sm:py-9">
          <h2 id="steps-title" className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
            Get started in three simple steps.
          </h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {copy.steps.map(([title, text], i) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hp-purple font-display text-xl font-bold text-white shadow-[0_6px_14px_-4px_rgba(76,29,149,0.5)]"
                >
                  {i + 1}
                </span>
                <div>
                  <strong className="block text-base font-bold text-slate-900">{title}</strong>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-slate-700 sm:text-center">{copy.dealNote}</p>
        </section>

        {/* Signup, compact (17 Oct 2026): the introduction on the left,
            the form beside it at its own height (no stretching to match),
            in a centred block about 1060px wide. Each piece is rendered
            once, in phone order: introduction, form, then who can join,
            so on a phone the form comes straight after the introduction.
            From 900px the grid puts "who can join" under the introduction
            and the form beside them; narrower than that, two columns
            would squeeze the form, so it stacks. */}
        <section
          id="business-signup"
          aria-labelledby="signup-title"
          className="mx-auto mt-4 grid max-w-[1060px] scroll-mt-24 grid-cols-1 gap-y-5 bg-white py-6 sm:py-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] min-[900px]:grid-rows-[auto_1fr] min-[900px]:items-start min-[900px]:gap-x-12 min-[900px]:gap-y-0"
        >
          <div className="min-[900px]:col-start-1 min-[900px]:row-start-1 lg:pt-10">
            <h2
              id="signup-title"
              className="font-display text-[32px] font-bold leading-[1.08] text-[#222126] lg:text-[40px]"
            >
              <span className="block">{copy.signupHeading[0]}</span>
              <span className="block text-brand-600">{copy.signupHeading[1]}</span>
            </h2>
            <p className="mt-2.5 text-[15px] text-[#222126] sm:text-base lg:text-lg">{copy.signupIntro}</p>
            <ul className="mt-3.5 space-y-1.5 lg:mt-5 lg:space-y-2.5">
              {copy.reassurances.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[15px] text-[#222126] lg:text-base">
                  <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hp-purple text-white">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full min-w-0 rounded-xl shadow-[0_18px_40px_-18px_rgba(76,29,149,0.35)] sm:max-w-[560px] lg:rounded-2xl min-[900px]:col-start-2 min-[900px]:row-span-2 min-[900px]:row-start-1 min-[900px]:max-w-none">
            {/* useSearchParams (?ref=) inside needs a Suspense boundary. */}
            <Suspense fallback={null}>
              <MerchantSignupForm launched={launched} redesign />
            </Suspense>
          </div>
          <div className="border-t border-[#E4E2E8] pt-5 text-[15px] text-[#625D6B] sm:text-base min-[900px]:col-start-1 min-[900px]:row-start-2 min-[900px]:mt-6 min-[900px]:pt-6">
            {/* Only on a phone, where this sits below the form. */}
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#222126] min-[900px]:hidden">Who can join?</h3>
            <div className="space-y-2.5 lg:text-[17px]">
              <p>{copy.eligibleFor}</p>
              <p>
                {copy.bookingClarification} {copy.notEligible}
              </p>
              <p className="font-medium text-[#222126]">{copy.companyEligibility}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="mt-10 sm:mt-12">
          <h2 id="faq-title" className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
            Frequently asked questions
          </h2>
          <div className="mt-4 divide-y divide-hp-line rounded-2xl border border-hp-line bg-white">
            {copy.faqs.map((faq, i) => (
              <details key={faq.question} className="group px-4 sm:px-5">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-base font-semibold text-hp-ink [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span aria-hidden="true" className="shrink-0 text-xl leading-none text-hp-muted transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[72ch] pb-4 text-base text-slate-700">
                  {faq.answer}
                  {i === 0 && (
                    <>
                      {" "}
                      <Link href={OFFER_TERMS_HREF} className="font-semibold text-brand-600 underline underline-offset-2">
                        View offer terms.
                      </Link>
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Ideas by industry: this page is the hub for business owners,
            each industry page a spoke (lib/businessLinks.ts). Same names
            and icons as the site's category bar. */}
        <section
          aria-labelledby="industries-title"
          className="mb-12 mt-10 rounded-3xl bg-hp-lavender px-4 py-7 sm:mt-12 sm:px-8 sm:py-9"
        >
          <h2 id="industries-title" className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
            Advertising ideas for your industry
          </h2>
          <p className="mt-1.5 text-base text-slate-600">
            Offer ideas, examples and tips for your type of business.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {ADVERTISE_PAGES.map((p) => {
              const Icon = INDUSTRY_ICONS[p.slug];
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="group flex h-full items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-14 sm:w-14">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold text-slate-900">{p.name}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-slate-600">{p.blurb}</span>
                    </span>
                    <ArrowRightIcon className="h-5 w-5 shrink-0 text-brand-600 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
