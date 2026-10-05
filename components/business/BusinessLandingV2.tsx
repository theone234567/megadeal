import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MerchantSignupForm from "@/app/list-your-business/MerchantSignupForm";
import DealCard from "@/components/DealCard";
import { CalendarIcon, CheckIcon, ChevronDownIcon, PercentIcon, UsersIcon } from "@/components/icons";
import { EXAMPLE_BURGER_DEAL } from "@/lib/exampleDeals";
import { businessPageCopy, OFFER_TERMS_HREF } from "@/lib/businessPageContent";
import { ADVERTISE_PAGES } from "@/lib/businessLinks";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/**
 * The redesigned /list-your-business (Business Page pack, 4 Oct 2026),
 * shown when LIST_BUSINESS_DESIGN is "v2" (lib/siteConfig.ts) and to
 * admins at /list-your-business?design=v2. The site's own header and
 * footer come from the root layout, so they appear exactly once.
 *
 * The signup is the existing form (MerchantSignupForm) in its two-step
 * layout: same fields, same checks, same account and application flow.
 */

const BENEFIT_ICONS = [UsersIcon, CalendarIcon, PercentIcon];


export default function BusinessLandingV2({ launched }: { launched: boolean }) {
  const copy = businessPageCopy(launched);

  return (
    <main className="bg-white text-slate-900">
      <ConversionTracker />
      <ViewContentTracker contentName="list_your_business" />
      {/* Only what's on the page: the service, and the FAQ exactly as shown. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Local business advertising",
            name: `${SITE_NAME} business advertising`,
            description: copy.intro,
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            url: `${SITE_URL}/list-your-business`,
          }),
        }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
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
        {/* Hero */}
        {/* Lavender rounded panel and ink + purple heading, sized as on the
            Beauty & Spa and coming-soon heroes. */}
        <section
          aria-labelledby="business-title"
          className="mt-5 grid items-center gap-8 rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-5 py-7 sm:mt-7 sm:rounded-3xl sm:px-9 sm:py-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 lg:px-12 lg:py-12"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-hp-purple">{copy.eyebrow}</p>
            <h1
              id="business-title"
              className="mt-3 font-display text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-hp-ink [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]"
            >
              {copy.headlineLead} <span className="block text-hp-purple">{copy.headlineAccent}</span>
            </h1>
            <p className="mt-4 text-xl font-bold text-hp-ink sm:text-2xl">{copy.subheading}</p>
            <p className="mt-2 text-base sm:text-lg" style={{ color: "#334155" }}>{copy.intro}</p>
            <a href="#business-signup" data-cta-section="hero" className="btn-primary mt-6 w-full px-7 py-3 text-base sm:w-auto">
              {copy.heroCta} →
            </a>
            <p className="mt-4 text-sm" style={{ color: "#475569" }}>
              {copy.offerQualifier.replace(/ Terms and conditions apply\.$/, "")}{" "}
              <Link href={OFFER_TERMS_HREF} className="font-semibold text-brand-600 underline underline-offset-2">
                Terms and conditions apply.
              </Link>
            </p>
            {copy.launchNote && (
              <p className="mt-1 text-sm" style={{ color: "#475569" }}>
                {copy.launchNote}
              </p>
            )}
          </div>

          {/* The real DealCard, as customers see it on the site, with
              example details: a card that can't drift from the real one.
              Not a link, and labelled as an example. */}
          <figure className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:mr-0">
            <figcaption className="mb-2 text-center text-xs font-semibold sm:text-sm" style={{ color: "#475569" }}>
              Example deal — not available to redeem
            </figcaption>
            <div aria-hidden className="pointer-events-none select-none rounded-2xl shadow-card-hover">
              <DealCard deal={EXAMPLE_BURGER_DEAL} preview />
            </div>
            <Image
              src="/megadeal/coming-soon-v2/mascot-hoodie-240.webp"
              alt=""
              width={240}
              height={248}
              sizes="110px"
              className="absolute -bottom-4 -right-3 h-auto w-[84px] sm:-right-8 sm:w-[110px] lg:-right-6 xl:-right-10"
            />
          </figure>
        </section>

        {/* Benefits */}
        <ul className="grid gap-5 pb-2 pt-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200">
          {copy.benefits.map(([title, text], i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <li key={title} className="flex gap-4 sm:px-6 sm:first:pl-0">
                <Icon className="h-9 w-9 shrink-0 text-brand-600" />
                <div>
                  <strong className="block text-base font-bold text-slate-900 sm:text-lg">{title}</strong>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">{text}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Steps */}
        <section aria-labelledby="steps-title" className="mt-6 sm:mt-8">
          <h2 id="steps-title" className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
            Get started in three simple steps.
          </h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200">
            {copy.steps.map(([title, text], i) => (
              <li key={title} className="flex gap-4 sm:px-6 sm:first:pl-0">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-xl font-bold text-brand-600"
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
          <p className="mt-5 text-sm text-slate-600 sm:text-center">{copy.dealNote}</p>
          {/* Ideas by industry, on their own pages (lib/businessLinks.ts). */}
          <nav aria-label="Advertising by industry" className="mt-4 text-sm text-slate-600 sm:text-center">
            <span className="font-semibold text-slate-800">Ideas for your industry:</span>{" "}
            {ADVERTISE_PAGES.map((p, i) => (
              <span key={p.href}>
                {i > 0 && <span aria-hidden> · </span>}
                <Link href={p.href} className="inline-block py-1 font-semibold text-brand-600 underline-offset-2 hover:underline">
                  {p.short}
                </Link>
              </span>
            ))}
          </nav>
        </section>

        {/* Signup (approved white design, 4 Oct 2026): white section, no
            panel; introduction 40%, form 60%. Each piece is rendered once,
            in phone order (introduction, company requirement, form, the
            rest of the eligibility); from lg the grid places the
            eligibility under the introduction and the form beside them. */}
        <section
          id="business-signup"
          aria-labelledby="signup-title"
          className="mt-4 grid scroll-mt-24 grid-cols-1 gap-y-6 bg-white py-8 sm:py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-10 lg:gap-y-0"
        >
          <div className="lg:col-start-1 lg:row-start-1">
            <h2
              id="signup-title"
              className="font-display text-[32px] font-bold leading-[1.1] text-brand-600 sm:text-[36px] lg:text-[40px]"
            >
              <span className="block">{copy.signupHeading[0]}</span>
              <span className="block">{copy.signupHeading[1]}</span>
            </h2>
            <p className="mt-3 text-base text-[#222126] sm:text-lg">{copy.signupIntro}</p>
            <ul className="mt-5 space-y-2.5">
              {copy.reassurances.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-base text-[#222126]">
                  <CheckIcon className="h-5 w-5 shrink-0 text-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-base font-medium text-[#222126] lg:col-start-1 lg:row-start-3 lg:mt-3">
            {copy.companyEligibility}
          </p>
          <div className="min-w-0 lg:col-start-2 lg:row-span-4 lg:row-start-1">
            {/* useSearchParams (?ref=) inside needs a Suspense boundary. */}
            <Suspense fallback={null}>
              <MerchantSignupForm launched={launched} twoStep />
            </Suspense>
          </div>
          <div className="space-y-3 border-t border-[#E4E2E8] pt-5 text-base text-[#625D6B] lg:col-start-1 lg:row-start-2 lg:mt-6 lg:pt-6">
            <p>{copy.eligibleFor}</p>
            <p>
              {copy.bookingClarification} {copy.notEligible}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" className="mb-12 mt-10 sm:mt-12">
          <h2 id="faq-title" className="font-display text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
            Frequently asked questions
          </h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {copy.faqs.map((faq, i) => (
              <details key={faq.question} className="group px-4 sm:px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" />
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
      </div>
    </main>
  );
}
