import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MerchantSignupForm from "@/app/list-your-business/MerchantSignupForm";
import { CalendarIcon, CheckIcon, ChevronDownIcon, MapPinIcon, PercentIcon, StoreIcon, UsersIcon } from "@/components/icons";
import { businessPageCopy, OFFER_TERMS_HREF } from "@/lib/businessPageContent";
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
        <section aria-labelledby="business-title" className="grid items-center gap-8 pb-8 pt-8 sm:pt-12 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-slate-600 sm:text-sm">{copy.eyebrow}</p>
            <h1
              id="business-title"
              className="mt-3 text-balance font-display text-[2.25rem] font-bold leading-[1.04] tracking-tight text-brand-600 sm:text-5xl lg:text-[3.6rem]"
            >
              {copy.headline}
            </h1>
            <p className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">{copy.subheading}</p>
            <p className="mt-2 text-base text-slate-700 sm:text-lg">{copy.intro}</p>
            <a href="#business-signup" data-cta-section="hero" className="btn-primary mt-6 w-full px-7 py-3 text-base sm:w-auto">
              {copy.heroCta} →
            </a>
            <p className="mt-4 text-sm text-slate-600">
              {copy.offerQualifier.replace(/ Terms and conditions apply\.$/, "")}{" "}
              <Link href={OFFER_TERMS_HREF} className="font-semibold text-brand-600 underline underline-offset-2">
                Terms and conditions apply.
              </Link>
            </p>
            {copy.launchNote && <p className="mt-1 text-sm text-slate-600">{copy.launchNote}</p>}
          </div>

          <figure className="relative mx-auto w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-card lg:max-w-none">
            <div className="relative overflow-hidden rounded-xl">
              <Image
                src="/megadeal-coming-soon/food-drink-v1.webp"
                alt="Illustrative burger and fries offer"
                width={800}
                height={600}
                sizes="(max-width: 1024px) 90vw, 470px"
                className="aspect-[3/2] max-h-[200px] w-full object-cover sm:max-h-none"
              />
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow">
                Example listing
              </span>
            </div>
            <figcaption className="px-2 pb-1 pr-28 pt-3">
              <strong className="block font-display text-lg text-slate-900 sm:text-xl">Your offer could be here</strong>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                <MapPinIcon className="h-4 w-4 shrink-0" />
                Your business · Auckland
              </span>
            </figcaption>
            <Image
              src="/megadeal/coming-soon-v2/mascot-hoodie-240.webp"
              alt=""
              width={240}
              height={248}
              sizes="110px"
              className="absolute -right-2 bottom-1 h-auto w-[96px] sm:w-[110px]"
            />
          </figure>
        </section>

        {/* Benefits */}
        <ul className="grid gap-5 border-t border-slate-200 py-7 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-slate-200">
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
        </section>

        {/* Signup */}
        <section
          id="business-signup"
          aria-labelledby="signup-title"
          className="mt-10 grid scroll-mt-24 gap-6 rounded-3xl bg-sky-50 p-4 sm:mt-12 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10"
        >
          <div>
            <h2 id="signup-title" className="text-balance font-display text-3xl font-bold leading-tight text-brand-600 sm:text-[2.5rem]">
              {copy.signupHeading}
            </h2>
            <ul className="mt-5 space-y-2.5">
              {copy.reassurances.map((t) => (
                <li key={t} className="flex items-center gap-3 text-base text-slate-800">
                  <CheckIcon className="h-5 w-5 shrink-0 text-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-1 border-t border-sky-200 pt-5 text-sm text-slate-700">
              <p>{copy.eligibility}</p>
              <p>{copy.bookingClarification}</p>
            </div>
            <p className="mt-5 flex items-start gap-3 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-800">
              <StoreIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              {copy.companyEligibility}
            </p>
          </div>
          {/* useSearchParams (?ref=) inside needs a Suspense boundary. */}
          <Suspense fallback={null}>
            <MerchantSignupForm launched={launched} twoStep />
          </Suspense>
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
