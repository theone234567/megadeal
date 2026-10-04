import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MerchantSignupForm from "@/app/list-your-business/MerchantSignupForm";
import DealCard from "@/components/DealCard";
import { CalendarIcon, CheckIcon, ChevronDownIcon, CloseIcon, PercentIcon, StoreIcon, UsersIcon } from "@/components/icons";
import { renderTerms } from "@/lib/dealTerms";
import type { Deal } from "@/lib/types";
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

/** What a business's deal looks like to customers: example details on
 *  the pack's illustrative photo. Never a real business or a live offer. */
const EXAMPLE_DEAL: Deal = {
  id: "example",
  slug: "example",
  name: "Gourmet burger & fries for two",
  description: "",
  image: "/megadeal-coming-soon/food-drink-v1.webp",
  now: 29,
  was: 48,
  formattedNow: null,
  formattedWas: null,
  discountPercent: 0,
  currency: "NZD",
  ribbon: null,
  categories: ["Food & Drink"],
  variantId: null,
  inStock: true,
  quantityAvailable: null,
  expiresAt: null,
  status: "Live",
  isFlash: false,
  terms: renderTerms(["mon-thu", "dine-in"], ""),
  businessName: "Your business",
  businessLogoUrl: null,
  businessWebsite: null,
  businessPhone: null,
  businessAddress: null,
  businessCity: "Auckland",
  businessSuburb: null,
  businessSlug: null,
  businessBio: null,
  businessHours: null,
  businessFacebookUrl: null,
  businessInstagramUrl: null,
  businessPriceRange: null,
  businessAmenities: [],
  businessBookingUrl: null,
  businessBookingEmail: null,
  businessLat: null,
  businessLng: null,
  businessRating: null,
  businessReviewCount: null,
  dealCode: null,
  bookingRequirement: "unknown",
};

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

          {/* The real DealCard, as customers see it on the site, with
              example details: a card that can't drift from the real one.
              Not a link, and labelled as an example. */}
          <figure className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:mr-0">
            <figcaption className="mb-2 text-center text-xs font-semibold text-slate-600 sm:text-sm">
              Example deal — not available to redeem
            </figcaption>
            <div aria-hidden className="pointer-events-none select-none rounded-2xl shadow-card-hover">
              <DealCard deal={EXAMPLE_DEAL} preview />
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
            <div className="mt-6 rounded-2xl border border-sky-100 bg-white px-4 py-4 shadow-sm sm:px-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-600">Who can join</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-800 sm:text-[0.9375rem]">
                <li className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-50 p-0.5 text-emerald-600" />
                  <span>{copy.eligibleFor}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-50 p-0.5 text-emerald-600" />
                  <span>{copy.bookingClarification}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CloseIcon className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-rose-50 p-0.5 text-rose-600" />
                  <span>{copy.notEligible}</span>
                </li>
              </ul>
              <p className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-3.5 text-sm font-semibold text-slate-800 sm:text-[0.9375rem]">
                <StoreIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                {copy.companyEligibility}
              </p>
            </div>
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
