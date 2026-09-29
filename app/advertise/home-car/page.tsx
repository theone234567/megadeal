import type { Metadata } from "next";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import {
  CalendarIcon,
  CheckIcon,
  CreditCardIcon,
  HeartIcon,
  MapPinIcon,
  PercentIcon,
  ReceiptIcon,
  TagIcon,
  UnlockIcon,
  UsersIcon,
} from "@/components/icons";
import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { BUSINESS_TYPES } from "./businessTypes";

/**
 * /advertise/home-car — for cleaning, garden, home-maintenance and
 * automotive businesses, built from the Home & Car business pack
 * (29 Sep 2026) on the /advertise/beauty-spa template: same gradient,
 * fonts, cards, business header (components/Header.tsx) and signup route.
 *
 * A business page, not a deal listing: the 24 offer ideas are editorial
 * examples (businessTypes.ts), never merchant data, and carry no
 * Product/Offer markup.
 */

const PAGE_URL = `${SITE_URL}/advertise/home-car`;
const TITLE = "Home & Car Business Advertising Auckland";
const DESCRIPTION =
  "Explore promotion ideas for Auckland cleaners, gardeners, home-maintenance and automotive businesses. See MegaDeal's current business advertising offer.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

// The same signup the other business pages send people to.
const SIGNUP_HREF = "/list-your-business#signup";

// The pre-launch offer, from the one place it's defined (lib/promo.ts), so
// this page can't drift from the signup form and admin approval. At launch
// the offer becomes 3 months (WELCOME3); switching this page over is part
// of wiring that change through signup and approval, not done here alone.
const PROMO = PRELAUNCH_PROMO;
const PROMO_MONTHS = `${PROMO.months} months`;

const HERO_GRADIENT =
  "radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%), linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)";

const INK = "#0F172A";
const BODY = "#475569";
const PURPLE = "#6520B5";
const LINE = "#E8E1EF";
const LAVENDER = "#F5F0FC";
const SOFT = "#FAF8FD";

const QUIET_DAYS = [
  {
    icon: UsersIcon,
    title: "Reach local customers",
    body: "Give Auckland locals another way to discover your business and the services you offer.",
  },
  {
    icon: TagIcon,
    title: "Promote selected services",
    body: "Choose a defined package, first-visit offer or quieter booking period that makes commercial sense for you.",
  },
  {
    icon: UnlockIcon,
    title: "Stay in control",
    body: "Set out your service area, availability, inclusions and conditions so customers know what to expect.",
  },
] as const;

const CLEAR_OFFER = [
  {
    icon: MapPinIcon,
    title: "Service area",
    body: "Name the suburbs or areas you cover and any travel or call-out charges.",
  },
  {
    icon: CheckIcon,
    title: "What's included",
    body: "Define the tasks, time allowance, materials, vehicle or property eligibility, and exclusions.",
  },
  {
    icon: CalendarIcon,
    title: "When it applies",
    body: "State booking requirements, valid dates and any restricted days or times.",
  },
  {
    icon: ReceiptIcon,
    title: "Extra charges",
    body: "Explain what costs extra and confirm additional work before carrying it out.",
  },
] as const;

const WHY_MEGADEAL = [
  {
    icon: MapPinIcon,
    title: "Auckland first",
    body: "MegaDeal is starting in Auckland, with a focus on helping locals discover businesses around them.",
  },
  {
    icon: PercentIcon,
    title: "0% commission",
    body: "MegaDeal does not take commission from the offers you promote through the platform. Advertising terms still apply.",
  },
  {
    icon: CreditCardIcon,
    title: "A launch offer for eligible businesses",
    body: `Eligible Auckland businesses applying before launch may receive up to ${PROMO_MONTHS} of free advertising, subject to the current offer terms.`,
  },
  {
    icon: UnlockIcon,
    title: "An offer that fits your business",
    body: "Choose the service, package or booking period you want to promote. You do not need to put your whole service list on special.",
  },
] as const;

// The order it really happens in: an admin approves the business, then the
// business creates offers in the portal, and each offer is reviewed before
// it's published.
const STEPS = [
  {
    number: "1",
    title: "Apply to join MegaDeal.",
    body: "Tell us about your business through the business signup. Eligibility and approval apply.",
  },
  {
    number: "2",
    title: "Prepare your offer.",
    body: "Once your business is approved, create your offer in the business portal: the price, inclusions, service area, availability and conditions.",
  },
  {
    number: "3",
    title: "Get ready to be discovered.",
    body: "Every offer is reviewed before it's published. Your business portal shows where yours is up to.",
  },
] as const;

const FAQS: { id: string; q: string; a: string }[] = [
  {
    id: "who-can-apply",
    q: "What kinds of home and car businesses can apply?",
    a: "This page is designed for cleaning, gardening, home-maintenance, car-wash, detailing, servicing, repair, tyre and wheel businesses. Applications are subject to MegaDeal's current eligibility and approval requirements.",
  },
  {
    id: "eligibility",
    q: "What are the current eligibility requirements?",
    a: "The current launch offer is for eligible Auckland businesses applying before launch and requires a New Zealand registered limited company. Approval and fair-use conditions apply. Check the current offer terms before applying.",
  },
  {
    id: "cost",
    q: "How much does advertising cost?",
    a: `Eligible businesses may receive up to ${PROMO_MONTHS} of free advertising under the current launch offer. Check the signup information and terms for eligibility, what is included, and pricing after the offer period.`,
  },
  {
    id: "commission",
    q: "Does MegaDeal take commission?",
    a: "MegaDeal currently advertises 0% commission on offers promoted through the platform. This is separate from any applicable advertising fees and promotion conditions.",
  },
  {
    id: "discount-everything",
    q: "Do I have to discount every service?",
    a: "No. Your offer can focus on a selected service, a clearly defined package, new customers or a booking period when you have capacity. Choose something that works commercially for your business.",
  },
  {
    id: "limit-scope",
    q: "Can I limit the service area or eligible vehicles?",
    a: "State the areas, property types, vehicle types and other conditions that apply to your offer. Keep the scope clear so customers can check whether it suits them before booking.",
  },
  {
    id: "quieter-days",
    q: "Can I use an offer to encourage quieter-day bookings?",
    a: "Yes. You can describe a promotion for selected days or periods when you have capacity. Set out the availability and booking requirements clearly. This does not guarantee bookings.",
  },
  {
    // The pack left this for the repository to answer: MegaDeal shows the
    // offer and its code; the customer books and pays the business itself
    // (the deal page says so beside every price).
    id: "bookings-payments",
    q: "Who handles enquiries, bookings and payments?",
    a: "Your business does. Customers find your offer on MegaDeal, get its deal code, then contact or book with you directly and pay you directly. MegaDeal doesn't take bookings or process payments, and you stay responsible for your service and your communication with customers.",
  },
  {
    id: "go-live",
    q: "When will my business or offer go live?",
    a: "Publication follows MegaDeal's current approval and launch process. Applying does not guarantee immediate publication. Check the status and instructions provided through the business signup or portal.",
  },
  {
    id: "not-listed",
    q: "What should I do if my service doesn't fit one of the examples?",
    a: "The examples are a starting point. Contact the MegaDeal team to discuss your business and check whether it fits the current eligibility requirements.",
  },
];

/** Sub-heading label, as on the other business pages. */
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wider ${light ? "text-white/80" : ""}`} style={light ? undefined : { color: PURPLE }}>
      {children}
    </p>
  );
}

function SectionHeading({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={`${fredoka.className} text-[30px] font-semibold leading-tight sm:text-[39px] ${className}`}
      style={{ color: INK }}
    >
      {children}
    </h2>
  );
}

export default function HomeCarAdvertisingPage() {
  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName="advertise_home_car" />
      {/* What this page is and who publishes it, plus the advertising
          service it describes, as on /advertise/beauty-spa and
          /advertise/restaurants. The publisher is the site's one
          Organization (app/layout.tsx), by @id. Deliberately no markup for
          the 24 offer ideas (examples, not offers anyone can buy) or the
          FAQ (FAQ rich results are gone; the answers are plain text on the
          page, which is what search and AI answers read). */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${TITLE} | ${SITE_NAME}`,
            description: DESCRIPTION,
            url: PAGE_URL,
            inLanguage: "en-NZ",
            publisher: { "@id": ORGANIZATION_ID },
            about: { "@id": `${PAGE_URL}#service` },
          }),
        }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${PAGE_URL}#service`,
            serviceType: "Home services and automotive business advertising",
            name: `${SITE_NAME} home & car business advertising`,
            description:
              "Zero-commission advertising for Auckland cleaning, gardening, home-maintenance, car wash and detailing, car servicing, and tyre and wheel businesses. Customers book and pay the business directly; MegaDeal never takes a cut of sales.",
            provider: { "@id": ORGANIZATION_ID, "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            audience: {
              "@type": "BusinessAudience",
              audienceType:
                "Cleaners, gardeners and landscapers, home-maintenance trades, car wash and detailing, car servicing and mechanics, tyre and wheel businesses",
            },
            url: PAGE_URL,
            makesOffer: {
              "@type": "Offer",
              name: `Up to ${PROMO_MONTHS} free advertising`,
              description: `Up to ${PROMO_MONTHS} of free advertising credits for qualifying businesses that join MegaDeal before its Auckland launch, using code ${PROMO.code}. Conditions apply.`,
              price: "0",
              priceCurrency: "NZD",
              availability: "https://schema.org/LimitedAvailability",
              url: `${PAGE_URL}#launch-offer`,
            },
          }),
        }}
      />

      <a
        href="#home-car-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6520B5] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id="home-car-main">
        {/* Hero: text and art in separate columns, so the mascot can
            never cover the copy. */}
        <section className="relative overflow-hidden text-white" style={{ background: HERO_GRADIENT }}>
          <div className="mx-auto grid max-w-[1184px] grid-cols-1 items-center gap-5 px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[48fr_52fr] lg:gap-12 lg:px-8 lg:pb-[72px] lg:pt-[64px]">
            <div>
              {/* The small label is part of the heading, looking exactly as
                  it did beside it: "More local jobs." alone says nothing
                  about what the page is, and the page's one heading is
                  what search engines and AI answers lean on most after
                  the title. */}
              <h1>
                <span className="block text-xs font-bold uppercase tracking-wider text-white/80">
                  Home &amp; car advertising in Auckland
                </span>{" "}
                <span
                  className={`${fredoka.className} mt-3 block text-[34px] font-semibold leading-[1.1] min-[390px]:text-[38px] sm:text-[50px] lg:text-[58px]`}
                >
                  More local jobs.{" "}
                  <span className="block" style={{ color: "#ADDFFF" }}>
                    More reasons to choose you.
                  </span>
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg">
                Give Auckland locals a reason to try your cleaning, gardening, home-maintenance or
                automotive business. Promote selected services when you have capacity, with an offer
                that works for you.
              </p>

              <div className="mt-7 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center">
                <a
                  href="#launch-offer"
                  data-cta-section="hero"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-brand-600 shadow-[0_10px_24px_rgba(20,6,50,.25)] transition hover:bg-brand-50 active:scale-95 sm:text-base"
                >
                  Explore the launch offer →
                </a>
                <a
                  href="#how-it-works"
                  data-cta-section="hero_secondary"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/70 bg-white px-6 py-3.5 text-sm font-extrabold text-[#6520B5] transition hover:border-white hover:bg-white/90 sm:text-base"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-white/90">
                {["0% commission", "You choose the offer", "Auckland first"].map((p) => (
                  <span key={p} className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4" /> {p}
                  </span>
                ))}
                <a href="#launch-offer" className="underline underline-offset-2 hover:no-underline">
                  Eligibility and offer terms
                </a>
              </div>
            </div>

            <HeroArt />
          </div>
        </section>

        {/* Shortcuts to the six business sections. Plain anchor links
            (not filters), a 2 x 3 grid on phones. */}
        <nav aria-label="Home & car business types" className="border-b bg-white" style={{ borderColor: LINE }}>
          <ul className="mx-auto grid max-w-[1184px] grid-cols-2 gap-2.5 px-4 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 lg:px-8">
            {BUSINESS_TYPES.map((b) => (
              <li key={b.id}>
                <a
                  href={`#${b.id}`}
                  // Icon above the label under 360px wide and on desktop, beside it
                  // in between: at 320px a label like "Maintenance" doesn't
                  // fit beside the icon in a half-width chip.
                  className="flex h-full min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-sm font-semibold leading-snug transition hover:border-[#6520B5]/40 hover:bg-[#F5EFFC] min-[360px]:flex-row min-[360px]:justify-start min-[360px]:gap-2.5 min-[360px]:px-3.5 min-[360px]:py-2.5 min-[360px]:text-left lg:flex-col lg:justify-center lg:gap-2 lg:py-4 lg:text-center"
                  style={{ borderColor: LINE, color: INK }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: LAVENDER, color: PURPLE }}
                  >
                    <b.icon className="h-[18px] w-[18px]" />
                  </span>
                  {b.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Put quieter days to work */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <div className="max-w-2xl">
              <SectionHeading>Put quieter days to work.</SectionHeading>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                A gap in the calendar can be an opportunity to introduce your business to someone
                new. Build an offer around a service you want to promote, a day you have capacity,
                or a package that helps customers understand what you do.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {QUIET_DAYS.map((c) => (
                <div key={c.title} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: LINE }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-4 text-lg font-semibold`} style={{ color: INK }}>
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: BODY }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The six business types, each with four example offer ideas */}
        <section className="px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8" style={{ backgroundColor: SOFT }}>
          <div className="mx-auto max-w-[1184px]">
            <div className="max-w-2xl">
              <SectionHeading>Real offer ideas for your kind of business.</SectionHeading>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                Different businesses need different promotions. Start with an idea below, then shape
                the scope and price around your own business.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {BUSINESS_TYPES.map((b) => (
                <article
                  key={b.id}
                  id={b.id}
                  aria-labelledby={`${b.id}-heading`}
                  className="scroll-mt-[104px] overflow-hidden rounded-[24px] border bg-white shadow-card"
                  style={{ borderColor: LINE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/home-car-business/${b.image}-1200.webp`}
                    srcSet={`/images/home-car-business/${b.image}-640.webp 640w, /images/home-car-business/${b.image}-1200.webp 1200w`}
                    sizes="(min-width: 1024px) 570px, 100vw"
                    alt={b.imageAlt}
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="h-[190px] w-full object-cover sm:h-[220px]"
                  />
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                        <b.icon className="h-5 w-5" />
                      </span>
                      <h3 id={`${b.id}-heading`} className={`${fredoka.className} text-[22px] font-semibold`} style={{ color: INK }}>
                        {b.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-base leading-[1.55]" style={{ color: BODY }}>
                      {b.intro}
                    </p>

                    <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ backgroundColor: LAVENDER }}>
                      <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: PURPLE }}>
                        Example offer ideas
                      </h4>
                      <ul className="mt-3 space-y-2.5">
                        {b.ideas.map((idea) => (
                          <li key={idea.title} className="flex items-start gap-2.5 text-[15px] leading-snug" style={{ color: INK }}>
                            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#6520B5]" />
                            <span>
                              <strong className="font-semibold">{idea.title}</strong>{" "}
                              <span style={{ color: BODY }}>— {idea.description}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-bold" style={{ color: INK }}>
                        Make the scope clear
                      </h4>
                      <ul className="mt-1.5 space-y-1.5 text-[14px] leading-relaxed" style={{ color: BODY }}>
                        {b.ideas.map((idea) => (
                          <li key={idea.title}>
                            <span className="font-semibold" style={{ color: INK }}>
                              {idea.title}:
                            </span>{" "}
                            {idea.scopeNote}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-center text-[15px] font-semibold leading-relaxed" style={{ color: INK }}>
              Ideas for inspiration only. Each business chooses its own offer, price, availability,
              service area and conditions. These examples are not live deals.
            </p>
          </div>
        </section>

        {/* Make your offer clear from the start */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <div className="max-w-2xl">
              <SectionHeading>Make your offer clear from the start.</SectionHeading>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                A useful offer answers the customer&rsquo;s practical questions before they book.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CLEAR_OFFER.map((c) => (
                <div key={c.title} className="rounded-[24px] border p-6" style={{ borderColor: LINE }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-bold" style={{ color: INK }}>
                    {c.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-relaxed" style={{ color: BODY }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-[24px] p-6 sm:p-8" style={{ backgroundColor: SOFT }}>
              <h3 className={`${fredoka.className} text-xl font-semibold`} style={{ color: INK }}>
                Start with one focused offer.
              </h3>
              <p className="mt-2 max-w-3xl text-base leading-relaxed" style={{ color: BODY }}>
                Choose a service you deliver well and can describe clearly. A midweek valet, a
                lawn-and-edge bundle or an introductory home clean can be easier to understand than
                a broad discount across everything you do. Check the labour, materials and travel
                involved before setting your offer.
              </p>
            </div>
          </div>
        </section>

        {/* Why MegaDeal (header link: #why-megadeal) */}
        <section id="why-megadeal" className="scroll-mt-[100px] px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8" style={{ backgroundColor: SOFT }}>
          <div className="mx-auto max-w-[1184px]">
            <SectionHeading>Why MegaDeal?</SectionHeading>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MEGADEAL.map((w) => (
                <div key={w.title} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: LINE }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <w.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-4 text-lg font-semibold`} style={{ color: INK }}>
                    {w.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: BODY }}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works (header link: #how-it-works) */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <SectionHeading>How it works.</SectionHeading>
            <ol className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.number} className="rounded-[24px] border p-6" style={{ borderColor: LINE }}>
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ backgroundColor: PURPLE }}
                  >
                    {s.number}
                  </span>
                  <h3 className={`${fredoka.className} mt-3 text-lg font-semibold`} style={{ color: INK }}>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[15px] leading-relaxed" style={{ color: BODY }}>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
            <a
              href="#launch-offer"
              data-cta-section="process"
              className="mt-8 inline-flex items-center gap-1.5 text-base font-bold hover:underline"
              style={{ color: PURPLE }}
            >
              Explore the launch offer →
            </a>
          </div>
        </section>

        {/* Launch offer (header and hero buttons land here) */}
        <section id="launch-offer" className="scroll-mt-[100px] px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8" style={{ backgroundColor: SOFT }}>
          <div className="mx-auto max-w-[1184px]">
            <div className="relative overflow-hidden rounded-[32px] px-6 py-10 text-white sm:px-12 sm:py-14" style={{ background: HERO_GRADIENT }}>
              <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
                <div>
                  <Eyebrow light>Auckland first</Eyebrow>
                  <h2 className={`${fredoka.className} mt-2 text-[28px] font-semibold leading-tight sm:text-[36px]`}>
                    Get in early. Build your presence.
                  </h2>
                  <p className="mt-3 text-lg font-bold leading-snug sm:text-xl">
                    Up to {PROMO_MONTHS} free advertising for eligible Auckland businesses.
                  </p>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-white/90">
                    Give your home-service or automotive business time to prepare its listing and
                    offer ahead of launch.
                  </p>
                </div>

                <div className="relative rounded-[24px] bg-white/10 p-6 text-center ring-1 ring-white/20 sm:p-8">
                  <a
                    href={SIGNUP_HREF}
                    data-cta-section="launch_offer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-extrabold shadow-card transition hover:bg-white/90 active:scale-95"
                    style={{ color: PURPLE }}
                  >
                    Join MegaDeal →
                  </a>
                  <p className="mt-4 text-base font-bold">Use {PROMO.code} at signup.</p>
                  <p className="mt-1 text-sm text-white/85">Continue to MegaDeal&rsquo;s business signup.</p>
                </div>
              </div>

              <p className="relative mt-8 border-t border-white/20 pt-5 text-sm leading-relaxed text-white/90">
                For eligible Auckland businesses applying before launch. Current eligibility requires
                a New Zealand registered limited company. Subject to approval and fair use.{" "}
                <Link href="/terms" className="font-bold text-white underline underline-offset-2 hover:no-underline">
                  View offer terms
                </Link>
              </p>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed" style={{ color: BODY }}>
              Run a restaurant, café, salon or spa instead?{" "}
              <Link href="/advertise/restaurants" className="font-semibold underline hover:no-underline" style={{ color: PURPLE }}>
                Restaurant advertising
              </Link>{" "}
              ·{" "}
              <Link href="/advertise/beauty-spa" className="font-semibold underline hover:no-underline" style={{ color: PURPLE }}>
                Beauty &amp; spa advertising
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ (header link: #questions) — native details/summary: keyboard
            and screen readers work without any script, and every answer is
            in the page's HTML. */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-[80px] lg:px-8">
          <div className="mx-auto max-w-3xl">
            <SectionHeading className="text-center">A few things you might be wondering.</SectionHeading>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.id}
                  name="home-car-faq"
                  data-faq-question={f.id}
                  className="group rounded-2xl border bg-white shadow-card"
                  style={{ borderColor: LINE }}
                >
                  <summary
                    className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-bold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6520B5]"
                    style={{ color: INK }}
                  >
                    {f.q}
                    <span aria-hidden className="shrink-0 text-xl leading-none text-slate-500 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed" style={{ color: BODY }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-center text-[15px]" style={{ color: BODY }}>
              Have a question about your business?{" "}
              <Link href="/contact" className="font-bold hover:underline" style={{ color: PURPLE }}>
                Talk to the MegaDeal team
              </Link>
            </p>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="bg-white px-4 pb-14 sm:px-6 sm:pb-[80px] lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <div className="rounded-[32px] px-6 py-12 text-center text-white sm:px-12 sm:py-14" style={{ background: HERO_GRADIENT }}>
              <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[28px] font-semibold leading-tight sm:text-[36px]`}>
                Give local customers a reason to choose you.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-white/90">
                Prepare a clear offer that shows what your business does well.
              </p>
              <a
                href={SIGNUP_HREF}
                data-cta-section="final_cta"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-extrabold shadow-card transition hover:bg-white/90 active:scale-95"
                style={{ color: PURPLE }}
              >
                List my business →
              </a>
              <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold text-white/90">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> 0% commission
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4" /> Auckland first
                </span>
                <span className="flex items-center gap-1.5">
                  <HeartIcon className="h-4 w-4" /> Built for local businesses
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Phones: the same fixed bar as the other business pages. */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:hidden"
          style={{ borderColor: LINE, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-[13px] font-bold min-[360px]:text-sm" style={{ color: INK }}>
            Up to <span className="whitespace-nowrap" style={{ color: PURPLE }}>{PROMO_MONTHS} free</span>
          </p>
          <a
            href="#launch-offer"
            data-cta-section="mobile_sticky"
            className="shrink-0 whitespace-nowrap rounded-full bg-brand-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-700 min-[360px]:px-5"
          >
            List my business
          </a>
        </div>
        {/* Room at the bottom so the fixed bar never covers the footer. */}
        <div className="h-16 sm:hidden" aria-hidden />
      </div>
    </main>
  );
}

/**
 * The hero art, straight on the hero's purple: MegaDeal's current hoodie
 * elephant (unchanged, never redrawn) in front, with the pack's house and
 * car as smaller supporting pieces behind it — house on the left, car on the
 * right, standing on the same ground line as the elephant's feet.
 *
 * The pack drew the house and car as one wide transparent image, far apart
 * and on different ground lines; hero-house-* and hero-car-* are the two
 * halves of it, cut apart unchanged so each can be placed here. The
 * original backdrop files are still in the folder.
 *
 * Everything is positioned in percentages of one box with a fixed aspect
 * ratio, so the whole scene scales together and nothing is cropped. The only
 * effects: one faint, wide glow so the purple hoodie doesn't sink into the
 * purple background, and small soft shadows under the feet, house and
 * wheels. Decorative apart from the mascot's description.
 */
function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[420px] sm:max-w-[500px] lg:aspect-[6/5] lg:max-w-[600px]">
      {/* The glow: fades to nothing well inside a box larger than the art,
          so it has no edge anywhere. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[20%]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(226, 204, 255, 0.30), rgba(226, 204, 255, 0.12) 50%, rgba(226, 204, 255, 0) 100%)",
        }}
      />

      {/* Ground shadows, local to what stands on the ground. */}
      <span aria-hidden className={`${SHADOW} bottom-[1%] left-[1%] h-[7%] w-[33%]`} style={SHADOW_STYLE} />
      <span aria-hidden className={`${SHADOW} bottom-[1%] right-[0%] h-[6%] w-[31%]`} style={SHADOW_STYLE} />
      <span aria-hidden className={`${SHADOW} bottom-[-1.5%] left-1/2 h-[7%] w-[40%] -translate-x-1/2 lg:w-[52%]`} style={SHADOW_STYLE} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/home-car-business/hero-house-640.webp"
        srcSet="/images/home-car-business/hero-house-360.webp 360w, /images/home-car-business/hero-house-640.webp 640w"
        sizes="(min-width: 1024px) 220px, 36vw"
        alt=""
        width={640}
        height={324}
        className="absolute bottom-[1.5%] left-0 h-auto w-[35%] select-none object-contain lg:w-[36%]"
        loading="eager"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/home-car-business/hero-car-640.webp"
        srcSet="/images/home-car-business/hero-car-360.webp 360w, /images/home-car-business/hero-car-640.webp 640w"
        sizes="(min-width: 1024px) 200px, 32vw"
        alt=""
        width={640}
        height={353}
        className="absolute bottom-[0.5%] right-0 h-auto w-[31%] select-none object-contain lg:w-[32%]"
        loading="eager"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/home-car-business/mascot-welcome-current-820.webp"
        srcSet="/images/home-car-business/mascot-welcome-current-480.webp 480w, /images/home-car-business/mascot-welcome-current-820.webp 820w"
        sizes="(min-width: 1024px) 480px, 60vw"
        alt="MegaDeal's welcoming lavender elephant wearing a purple M hoodie"
        width={820}
        height={847}
        className="absolute bottom-0 left-1/2 h-[97%] w-auto max-w-none -translate-x-1/2 select-none object-contain"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
}

const SHADOW = "pointer-events-none absolute rounded-[50%]";
const SHADOW_STYLE = {
  background: "radial-gradient(closest-side, rgba(30, 6, 72, 0.38), rgba(30, 6, 72, 0))",
};
