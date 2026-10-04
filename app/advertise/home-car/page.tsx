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
 * (29 Sep 2026); restyled 4 Oct 2026 to the current /advertise/beauty-spa
 * look (lavender hero panel and photo, pills, cards, buttons) with all of
 * its own copy kept. Same business header (components/Header.tsx) and
 * signup route as the other business pages.
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

// Hero photo (owner-supplied, 4 Oct 2026): AI-generated illustration of a
// mobile car detailer outside a home, not a verified business or property.
// Versioned files; the previous hero art (hero-house-*, hero-car-*,
// mascot-welcome-current-*) is still in public/images/home-car-business/.
const HERO_PHOTO = {
  src: "/images/advertise/home-car/home-car-hero-v2.webp", // 1448×1086
  small: "/images/advertise/home-car/home-car-hero-v2-720.webp", // 720×540, phones
  alt: "A mobile car detailer washing a car outside a home.",
};
// The approved mascot this page already used, kept small (owner's brief).
const HERO_MASCOT = "/images/home-car-business/mascot-welcome-current-480.webp";

// Beauty & Spa's buttons and section heading (app/advertise/beauty-spa).
const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2";

const INK = "#0F172A";
const BODY = "#475569";
const PURPLE = "#6520B5";
const LINE = "#E8E1EF";
const LAVENDER = "#F5EFFC";

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
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: PURPLE }}>
      {children}
    </p>
  );
}

/** Beauty & Spa's section heading: Fredoka, 26/32px, centred. */
function SectionHeading({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={`${fredoka.className} mx-auto max-w-2xl text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px] ${className}`}
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
        {/* Hero — Beauty & Spa's: a pale lavender rounded panel, text left
            and one photo right (text and buttons first on phones). */}
        <section className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-5 py-7 sm:rounded-3xl sm:px-9 sm:py-10 md:grid-cols-[1.12fr_1fr] md:gap-8 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-12">
            <div>
              {/* The small label is part of the heading: "More local jobs."
                  alone says nothing about what the page is, and the page's
                  one heading is what search engines and AI answers lean on
                  most after the title. */}
              <h1>
                <span className="block text-xs font-bold uppercase tracking-[0.08em] text-hp-purple">
                  Home &amp; car advertising in Auckland
                </span>{" "}
                <span
                  className={`${fredoka.className} mt-3 block text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-hp-ink [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]`}
                >
                  More local jobs.{" "}
                  <span className="block text-hp-purple">More reasons to choose you.</span>
                </span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed sm:text-lg md:text-base lg:text-lg" style={{ color: "#334155" }}>
                Give Auckland locals a reason to try your cleaning, gardening, home-maintenance or
                automotive business. Promote selected services when you have capacity, with an offer
                that works for you.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                {/* One line at every width: full width with a little less
                    padding on the narrowest phones. */}
                <a
                  href="#launch-offer"
                  data-cta-section="hero"
                  className={`${PRIMARY_BUTTON} w-full whitespace-nowrap max-[359px]:px-3 max-[359px]:text-[15px] min-[400px]:w-auto`}
                >
                  Explore the launch offer →
                </a>
                <a
                  href="#how-it-works"
                  data-cta-section="hero_secondary"
                  className="inline-flex min-h-11 items-center text-base font-bold text-hp-purple underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-hp-ink">
                {["0% commission", "You choose the offer", "Auckland first"].map((p) => (
                  <span key={p} className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4 text-hp-purple" /> {p}
                  </span>
                ))}
                <a href="#launch-offer" className="text-hp-purple underline underline-offset-2 hover:no-underline">
                  Eligibility and offer terms
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
                {/* <picture>, as on Beauty & Spa: next/image is unoptimized on
                    this site (next.config.mjs), so it can't hand phones a
                    smaller file; this does. */}
                <picture>
                  <source media="(min-width: 640px)" srcSet={HERO_PHOTO.src} width={1448} height={1086} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_PHOTO.small}
                    alt={HERO_PHOTO.alt}
                    width={720}
                    height={540}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: "60% 50%" }}
                  />
                </picture>
                {/* Small and decorative, in the corner clear of the worker;
                    hidden on narrow phones. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_MASCOT}
                  alt=""
                  width={480}
                  height={496}
                  decoding="async"
                  className="pointer-events-none absolute bottom-2 right-2 hidden h-[64px] w-auto sm:block lg:h-[76px]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Shortcuts to the six business sections: Beauty & Spa's pills,
            wrapping onto more lines rather than scrolling. */}
        <nav aria-label="Home & car business types" className="border-b bg-white" style={{ borderColor: LINE }}>
          <ul className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2.5 px-4 py-4 sm:px-6 lg:px-8">
            {BUSINESS_TYPES.map((b) => (
              <li key={b.id}>
                <a
                  href={`#${b.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#6520B5]/40 hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                  style={{ borderColor: LINE, color: INK }}
                >
                  <b.icon className="h-4 w-4 text-[#6520B5]" />
                  {b.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Put quieter days to work */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <SectionHeading>Put quieter days to work.</SectionHeading>
              <p className="mt-4 text-base leading-relaxed" style={{ color: BODY }}>
                A gap in the calendar can be an opportunity to introduce your business to someone
                new. Build an offer around a service you want to promote, a day you have capacity,
                or a package that helps customers understand what you do.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {QUIET_DAYS.map((c) => (
                <div key={c.title} className="rounded-xl border bg-white p-6" style={{ borderColor: LINE }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-4 font-semibold`} style={{ color: INK }}>
                    {c.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: BODY }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The six business types, each with four example offer ideas */}
        <section className="bg-hp-lavender px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <SectionHeading>Real offer ideas for your kind of business.</SectionHeading>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                Different businesses need different promotions. Start with an idea below, then shape
                the scope and price around your own business.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {BUSINESS_TYPES.map((b) => (
                <article
                  key={b.id}
                  id={b.id}
                  aria-labelledby={`${b.id}-heading`}
                  className="scroll-mt-[100px] overflow-hidden rounded-xl border bg-white"
                  style={{ borderColor: LINE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/home-car-business/${b.image}-1200.webp`}
                    srcSet={`/images/home-car-business/${b.image}-640.webp 640w, /images/home-car-business/${b.image}-1200.webp 1200w`}
                    sizes="(min-width: 1024px) 600px, 100vw"
                    alt={b.imageAlt}
                    width={1200}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] w-full object-cover"
                  />
                  <div className="p-7">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                        <b.icon className="h-5 w-5" />
                      </span>
                      <h3 id={`${b.id}-heading`} className={`${fredoka.className} text-xl font-semibold`} style={{ color: INK }}>
                        {b.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: BODY }}>
                      {b.intro}
                    </p>

                    <div className="mt-4 rounded-xl border border-dashed p-3.5" style={{ borderColor: LINE }}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BODY }}>
                        Example offer ideas
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {b.ideas.map((idea) => (
                          <li key={idea.title} className="flex items-start gap-2 text-sm leading-snug" style={{ color: INK }}>
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
                      <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed" style={{ color: BODY }}>
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

            <p className="mx-auto mt-8 max-w-2xl text-center text-sm font-semibold leading-relaxed" style={{ color: INK }}>
              Ideas for inspiration only. Each business chooses its own offer, price, availability,
              service area and conditions. These examples are not live deals.
            </p>
          </div>
        </section>

        {/* Make your offer clear from the start */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <SectionHeading>Make your offer clear from the start.</SectionHeading>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                A useful offer answers the customer&rsquo;s practical questions before they book.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CLEAR_OFFER.map((c) => (
                <div key={c.title} className="flex items-start gap-4 rounded-xl border bg-white p-6" style={{ borderColor: LINE }}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold" style={{ color: INK }}>
                      {c.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: BODY }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-10 max-w-[760px] text-center">
              <h3 className={`${fredoka.className} text-2xl font-semibold`} style={{ color: INK }}>
                Start with one focused offer.
              </h3>
              <p className="mt-3 text-base leading-relaxed" style={{ color: BODY }}>
                Choose a service you deliver well and can describe clearly. A midweek valet, a
                lawn-and-edge bundle or an introductory home clean can be easier to understand than
                a broad discount across everything you do. Check the labour, materials and travel
                involved before setting your offer.
              </p>
            </div>
          </div>
        </section>

        {/* Why MegaDeal (header link: #why-megadeal) */}
        <section id="why-megadeal" className="scroll-mt-[100px] bg-hp-lavender px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <SectionHeading>Why MegaDeal?</SectionHeading>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MEGADEAL.map((w) => (
                <div key={w.title} className="rounded-xl border bg-white p-6" style={{ borderColor: LINE }}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: LAVENDER, color: PURPLE }}>
                    <w.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-4 font-semibold`} style={{ color: INK }}>
                    {w.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: BODY }}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works (header link: #how-it-works) */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <SectionHeading>How it works.</SectionHeading>
            <ol className="mt-10 grid grid-cols-1 gap-10 text-left sm:grid-cols-3 sm:gap-8">
              {STEPS.map((s) => (
                <li key={s.number}>
                  <span
                    aria-hidden
                    className={`${fredoka.className} flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold`}
                    style={{ backgroundColor: "#F1EBFB", color: PURPLE }}
                  >
                    {s.number}
                  </span>
                  <h3 className={`${fredoka.className} mt-3 font-semibold`} style={{ color: INK }}>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: BODY }}>
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
            <a
              href="#launch-offer"
              data-cta-section="process"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
              style={{ color: PURPLE }}
            >
              Explore the launch offer →
            </a>
          </div>
        </section>

        {/* Launch offer (header and hero buttons land here) — Beauty &
            Spa's pale blue panel with a white signup card. */}
        <section id="launch-offer" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid grid-cols-1 items-center gap-8 rounded-3xl px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1.1fr_1fr]" style={{ backgroundColor: "#EEF6FC" }}>
              <div>
                <Eyebrow>Auckland first</Eyebrow>
                <h2 className={`${fredoka.className} mt-2 text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: INK }}>
                  Get in early. Build your presence.
                </h2>
                <p className="mt-3 text-lg font-bold leading-snug" style={{ color: INK }}>
                  Up to {PROMO_MONTHS} free advertising for eligible Auckland businesses.
                </p>
                <p className="mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: BODY }}>
                  Give your home-service or automotive business time to prepare its listing and
                  offer ahead of launch.
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6 text-center sm:p-8" style={{ borderColor: LINE }}>
                <a href={SIGNUP_HREF} data-cta-section="launch_offer" className={`flex w-full ${PRIMARY_BUTTON}`}>
                  Join MegaDeal →
                </a>
                <p className="mt-3 text-xs font-semibold" style={{ color: INK }}>
                  Use {PROMO.code} at signup.
                </p>
                <p className="mt-1 text-xs" style={{ color: BODY }}>
                  Continue to MegaDeal&rsquo;s business signup.
                </p>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed" style={{ color: BODY }}>
              For eligible Auckland businesses applying before launch. Current eligibility requires
              a New Zealand registered limited company. Subject to approval and fair use.{" "}
              <Link href="/terms" className="underline hover:no-underline" style={{ color: PURPLE }}>
                View offer terms
              </Link>
            </p>

            <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed" style={{ color: BODY }}>
              Run a restaurant, café, salon or spa instead?{" "}
              <Link href="/advertise/restaurants" className="underline hover:no-underline" style={{ color: PURPLE }}>
                Restaurant advertising
              </Link>{" "}
              ·{" "}
              <Link href="/advertise/beauty-spa" className="underline hover:no-underline" style={{ color: PURPLE }}>
                Beauty &amp; spa advertising
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ (header link: #questions) — native details/summary: keyboard
            and screen readers work without any script, and every answer is
            in the page's HTML. */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <SectionHeading>A few things you might be wondering.</SectionHeading>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.id}
                  name="home-car-faq"
                  data-faq-question={f.id}
                  className="group rounded-xl border bg-white p-5"
                  style={{ borderColor: LINE }}
                >
                  <summary
                    className="cursor-pointer list-none font-bold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6520B5]"
                    style={{ color: INK }}
                  >
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: BODY }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-center text-sm" style={{ color: BODY }}>
              Have a question about your business?{" "}
              <Link href="/contact" className="font-bold hover:underline" style={{ color: PURPLE }}>
                Talk to the MegaDeal team
              </Link>
            </p>
          </div>
        </section>

        {/* Closing call to action — the hero's lavender panel again */}
        <section className="bg-white px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-6 py-10 text-center sm:rounded-3xl sm:px-12 sm:py-12">
            <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[26px] font-semibold leading-tight text-hp-ink [text-wrap:balance] sm:text-[32px]`}>
              Give local customers a reason to choose you.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: BODY }}>
              Prepare a clear offer that shows what your business does well.
            </p>
            <a href={SIGNUP_HREF} data-cta-section="final_cta" className={`mt-6 ${PRIMARY_BUTTON}`}>
              List my business →
            </a>
            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm font-semibold text-hp-ink">
              <span className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-hp-purple" /> 0% commission
              </span>
              <span aria-hidden className="text-hp-muted">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4 text-hp-purple" /> Auckland first
              </span>
              <span aria-hidden className="text-hp-muted">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <HeartIcon className="h-4 w-4 text-hp-purple" /> Built for local businesses
              </span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
