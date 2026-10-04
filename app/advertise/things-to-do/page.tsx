import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import {
  CalendarIcon,
  CheckIcon,
  CompassIcon,
  CreditCardIcon,
  HeartIcon,
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
 * /advertise/things-to-do — the Things To Do pack (4 Oct 2026): the
 * Beauty & Spa page's template (app/advertise/beauty-spa/page.tsx) with
 * activity and experience copy. A scoped copy rather than a shared
 * template, so Beauty & Spa can't change by accident.
 *
 * The offer follows the site's launch state (SITE_LAUNCHED, lib/promo.ts):
 * before launch, up to 6 months and "starts when MegaDeal goes live";
 * after it, the launch offer, with no pre-launch wording left behind.
 */

const LAUNCHED = SITE_LAUNCHED;
const PROMO = currentPromo(LAUNCHED);
const OFFER = `Up to ${PROMO.months} months free advertising`;

const TITLE = "Activity & Experience Advertising Auckland";
const DESCRIPTION = LAUNCHED
  ? `Promote your Auckland tours, activities and experiences with MegaDeal. Eligible new businesses can receive up to ${PROMO.months} months free advertising. Terms apply.`
  : "Promote your Auckland tours, activities and experiences with MegaDeal. Eligible pre-launch businesses can receive up to six months free advertising. Terms apply.";

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

/** One card per kind of activity business, matching the pills. A card
 *  with no `image` shows its icon on a lavender panel instead. */
const CATEGORIES: {
  id: string;
  title: string;
  icon: typeof CompassIcon;
  image: { src: string; alt: string } | null;
  body: string;
  offerIdeas: string[];
}[] = [
  {
    id: "tours-sightseeing",
    title: "Tours & Sightseeing",
    icon: CompassIcon,
    image: { src: `${IMG}/tours-sightseeing-v1.webp`, alt: "A guide showing a harbour viewpoint to visitors" },
    body: "Promote guided walks, sightseeing tours and local discovery experiences to Aucklanders looking to see more of their own city. A MegaDeal offer can focus on selected departures with spare places, while leaving your busiest tours at their usual price.",
    offerIdeas: ["Midweek guided tour", "Local discovery package", "Small-group experience", "Selected-departure offer"],
  },
  {
    id: "adventure-outdoors",
    title: "Adventure & Outdoors",
    icon: LeafIcon,
    image: { src: `${IMG}/adventure-outdoors-v1.webp`, alt: "Cyclists riding along a scenic coastal trail" },
    body: "Introduce more locals to kayaking, climbing and other outdoor experiences. Choose the session, group size and dates that suit your operation. Make any age, ability, equipment and weather requirements clear so customers can choose an experience that is right for them.",
    offerIdeas: ["Quiet-session adventure", "Introductory outdoor experience", "Activity for two", "Selected weekday package"],
  },
  {
    id: "indoor-activities",
    title: "Indoor Activities",
    icon: TicketIcon,
    image: { src: `${IMG}/indoor-activities-v1.webp`, alt: "Friends enjoying an indoor bowling activity" },
    body: "Give locals a reason to visit on quieter days. Bowling, escape rooms, mini golf and other indoor activities can promote selected sessions or group packages without reducing prices across the whole schedule. Keep the inclusions and booking requirements easy to understand.",
    offerIdeas: ["Midweek group package", "Selected-session offer", "Activity plus a complimentary extra", "Introductory experience"],
  },
  {
    id: "family-experiences",
    title: "Family Experiences",
    icon: UsersIcon,
    image: { src: `${IMG}/family-experiences-v1.webp`, alt: "A family playing mini golf together" },
    body: "Help families plan their next day out with a clear offer on a local activity or attraction. A family package or selected-date offer can introduce new visitors to your business. Explain how many adults and children are included, along with age limits and available dates.",
    offerIdeas: ["Family activity package", "Selected-date experience", "Parent-and-child offer", "Activity package with an extra"],
  },
  {
    id: "workshops-classes",
    title: "Workshops & Classes",
    icon: SparklesIcon,
    image: { src: `${IMG}/workshops-classes-v1.webp`, alt: "Adults learning pottery in a creative workshop" },
    body: "Introduce locals to a new skill or hobby with selected creative workshops and introductory classes. Whether you offer pottery, cooking, art or another hands-on experience, choose a promotion that works for your materials, group size and schedule.",
    offerIdeas: ["Beginner pottery workshop", "Creative class for two", "Introductory hobby session", "Selected-date cooking class"],
  },
  {
    id: "cruises-day-trips",
    title: "Cruises & Day Trips",
    icon: SuitcaseIcon,
    image: { src: `${IMG}/cruises-day-trips-v1.webp`, alt: "A passenger boat on a coastal sightseeing trip" },
    body: "Showcase available places on selected sailings and day trips. Focus on departures where you would like more customers, and make the departure point, duration and inclusions clear. Customers book with you directly, so you stay in control of availability and confirmation.",
    offerIdeas: ["Weekday cruise", "Selected-departure package", "Day trip with an added extra", "Local sightseeing experience"],
  },
];

const INTRO_CARDS = [
  {
    icon: CalendarIcon,
    title: "Fill Quieter Sessions",
    body: "Create an offer around the dates, departures or sessions where you would like more customers.",
  },
  {
    icon: UsersIcon,
    title: "Reach Local Customers",
    body: "Put your experiences in front of Aucklanders looking for things to do close to home.",
  },
  {
    icon: UnlockIcon,
    title: "Stay in Control",
    body: "You choose the offer, dates, availability and conditions that work for your business.",
  },
] as const;

const SMARTER_CARDS = [
  {
    icon: CalendarIcon,
    title: "Target Quieter Sessions",
    body: "If Saturday afternoon already fills, focus on a quieter weekday or selected departure instead.",
  },
  {
    icon: TicketIcon,
    title: "Introduce a Great First Experience",
    body: "An introductory workshop, guided tour or activity package can give someone a reason to try something new.",
  },
  {
    icon: CheckIcon,
    title: "Protect Your Busiest Dates",
    body: "Keep control of the sessions and dates included. You do not need to promote every place or every experience.",
  },
  {
    icon: MegaphoneIcon,
    title: "Make the Offer Easy to Understand",
    body: "Explain what is included, who it is suitable for, how to book and any restrictions before customers make plans.",
  },
] as const;

// Each idea reuses its category card's photo (already downloaded for the
// card above), so it's decorative here: empty alt, the text says it all.
const PROMOTION_IDEAS = [
  { tag: "Midweek", title: "Guided local tour", offer: "Selected weekday departure", image: `${IMG}/tours-sightseeing-v1.webp` },
  { tag: "Outdoors", title: "Adventure for two", offer: "Introductory experience package", image: `${IMG}/adventure-outdoors-v1.webp` },
  { tag: "Indoors", title: "Bowling or escape room", offer: "Quiet-session group offer", image: `${IMG}/indoor-activities-v1.webp` },
  { tag: "Family", title: "A day out together", offer: "Selected-date family package", image: `${IMG}/family-experiences-v1.webp` },
  { tag: "Creative", title: "Try a new skill", offer: "Beginner workshop experience", image: `${IMG}/workshops-classes-v1.webp` },
  { tag: "On the water", title: "Cruise or day trip", offer: "Selected departure with an extra", image: `${IMG}/cruises-day-trips-v1.webp` },
] as const;

const WHY_MEGADEAL = [
  {
    icon: MapPinIcon,
    title: "Local Customers",
    body: "MegaDeal is launching in Auckland first, connecting locals with businesses and experiences around them.",
  },
  {
    icon: PercentIcon,
    title: "0% Commission",
    body: "Customers book and pay you directly. MegaDeal does not take a percentage of your sales.",
  },
  {
    icon: CreditCardIcon,
    title: `Up to ${PROMO.months} Months Free`,
    body: LAUNCHED
      ? `Eligible new businesses can receive up to ${PROMO.months} months of free advertising.`
      : "Eligible businesses that join before launch can receive up to six months of free advertising, starting when MegaDeal goes live.",
  },
  {
    icon: UnlockIcon,
    title: "You’re in Control",
    body: "Choose the experience, availability and booking conditions that make sense for your business.",
  },
] as const;

const STEPS = [
  { number: "1", title: "Join MegaDeal", body: "Tell us about your activity, tour or experience business." },
  {
    number: "2",
    title: "Create Your Offer",
    body: "Choose your experience, inclusions, dates and booking details. Preview it before publication.",
  },
  {
    number: "3",
    title: "Reach More Locals",
    body: "When deals go live, customers can discover your offer and contact or book with you directly.",
  },
] as const;

// Plain text: also the FAQPage JSON-LD below.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does it cost to advertise my activity business on MegaDeal?",
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
    q: "How do customers book their experience?",
    a: "Customers use the booking or contact options you provide, such as your booking website or phone number. You confirm availability and take payment directly. If your activity welcomes walk-ins, make that clear in the offer. Viewing a deal does not reserve a place.",
  },
  {
    q: "Can I choose the dates and number of places available?",
    a: "You decide which dates, sessions and availability apply to your offer. Explain any booking requirements and restrictions clearly. Manage confirmed bookings through your own process; MegaDeal does not automatically synchronise your booking calendar.",
  },
  {
    q: "What happens after the free period?",
    // Top-ups are arranged with us for now: no purchase screen in the
    // portal yet (same wording as /list-your-business).
    a: "You can choose whether to continue advertising using pay-as-you-go credits. We’ll confirm the cost with you before you buy any. There is no lock-in contract.",
  },
  {
    q: "What are the current eligibility requirements?",
    a: "MegaDeal is launching in Auckland first and currently accepts New Zealand registered limited companies. Sole traders and partnerships are not currently eligible. E-commerce retail and adult businesses are not eligible. Eligible local activity businesses can use their own websites for bookings and payments. Applications and offers remain subject to the existing eligibility and approval process.",
  },
];

const H2 = `${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`;
const EYEBROW = "text-xs font-bold uppercase tracking-wider";
const INK = { color: "#0F172A" };
const MUTED = { color: "#475569" };
const PURPLE = { color: "#6520B5" };
const LINE = { borderColor: "#E8E1EF" };
const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2";

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
        {/* Hero — the Beauty & Spa hero: lavender rounded panel, text left,
            photo right with the mascot at its lower edge. */}
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
                their next day out. You choose the offer. Customers book and pay you directly.
              </p>
              <p className={`${fredoka.className} mt-5 text-xl font-semibold text-hp-purple sm:text-2xl`}>{OFFER}*</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a href={SIGNUP_HREF} data-cta-section="hero" className={PRIMARY_BUTTON}>
                  List your business <span aria-hidden>→</span>
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
                <span className="whitespace-nowrap">No credit card</span>
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

        {/* Category pills — down to each kind of business below */}
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

        {/* The core idea */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Things To Do advertising in Auckland
            </p>
            <h2 className={H2} style={INK}>
              An empty place can&rsquo;t be sold tomorrow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={MUTED}>
              A tour with spare seats. An activity session with room for more. A workshop that
              hasn&rsquo;t filled. Once that time passes, the opportunity is gone. MegaDeal gives
              local activity businesses another way to make quieter times work harder—with an
              appealing offer that introduces more people to what you do.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              {INTRO_CARDS.map((c) => (
                <div key={c.title} className="rounded-xl border bg-white p-6" style={LINE}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={INK}>
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={MUTED}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* One card per kind of activity business, matching the pills */}
        <section className="bg-hp-lavender px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <p className={EYEBROW} style={PURPLE}>
                Every kind of experience
              </p>
              <h2 className={H2} style={INK}>
                Built for activity and experience businesses.
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={MUTED}>
                Not every experience works the same way. That is why your promotion
                shouldn&rsquo;t have to look the same either.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {CATEGORIES.map((c) => (
                <div key={c.id} id={c.id} className="scroll-mt-[100px] overflow-hidden rounded-xl border bg-white" style={LINE}>
                  {c.image ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image src={c.image.src} alt={c.image.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <div aria-hidden className="flex aspect-[16/7] w-full items-center justify-center bg-gradient-to-br from-[#F5EFFC] to-[#ECE4FA]">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#6520B5] shadow-sm">
                        <c.icon className="h-8 w-8" />
                      </span>
                    </div>
                  )}
                  <div className="p-7">
                    <h3 className={`${fredoka.className} text-xl font-semibold`} style={INK}>
                      {c.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={MUTED}>
                      {c.body}
                    </p>
                    <div className="mt-4 rounded-xl border border-dashed p-3.5" style={LINE}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={MUTED}>
                        Example offer ideas
                      </p>
                      <ul className="mt-1.5 space-y-1 text-sm" style={INK}>
                        {c.offerIdeas.map((idea) => (
                          <li key={idea} className="flex items-start gap-1.5">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: "#6520B5" }} />
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Promote smarter, not just cheaper */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              A smarter kind of promotion
            </p>
            <h2 className={H2} style={INK}>
              Don&rsquo;t discount everything. Promote smarter.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base" style={MUTED}>
              A good promotion doesn&rsquo;t need to make every experience cheaper. Give someone a
              compelling reason to discover your business while choosing an offer that works
              commercially for you.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
              {SMARTER_CARDS.map((c) => (
                <div key={c.title} className="flex items-start gap-4 rounded-xl border bg-white p-6" style={LINE}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold" style={INK}>
                      {c.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example offer ideas */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Need inspiration?
            </p>
            <h2 className={H2} style={INK}>
              Activity promotion ideas.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
              {PROMOTION_IDEAS.map((d) => (
                <div key={d.tag} className="overflow-hidden rounded-xl border bg-white" style={LINE}>
                  <div className="relative aspect-[16/10] w-full">
                    <Image src={d.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-wide" style={PURPLE}>
                      {d.tag}
                    </p>
                    <p className={`${fredoka.className} mt-1 text-lg font-semibold`} style={INK}>
                      {d.title}
                    </p>
                    <div className="mt-4 rounded-xl border border-dashed px-3 py-2.5" style={LINE}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={MUTED}>
                        Example offer
                      </p>
                      <p className="mt-0.5 text-sm font-bold" style={INK}>
                        {d.offer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-xs" style={MUTED}>
              Examples are for inspiration only. Each participating business chooses its own offer,
              availability and applicable conditions.
            </p>
          </div>
        </section>

        {/* The first booking is the introduction */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
              Give someone a reason to try something new.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={MUTED}>
              People often need a little encouragement to book an experience they haven&rsquo;t
              tried before. A clear, appealing offer can help them take that first step—whether it
              is a local tour, a creative class or a family day out.
            </p>
            <p className="mt-4 text-base leading-relaxed" style={MUTED}>
              The offer is only the introduction. The experience you deliver can give customers a
              reason to recommend your business or return for something different. MegaDeal helps
              people discover you.
            </p>
            <p className={`${fredoka.className} mt-5 text-2xl font-semibold`} style={INK}>
              You take it from there.
            </p>
          </div>
        </section>

        {/* Why MegaDeal (header nav: #why-megadeal) */}
        <section id="why-megadeal" className="scroll-mt-[100px] bg-hp-lavender px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              More opportunity. Less commission.
            </p>
            <h2 className={H2} style={INK}>
              Why MegaDeal?
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MEGADEAL.map((w) => (
                <div key={w.title} className="rounded-xl border bg-white p-6" style={LINE}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}>
                    <w.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={INK}>
                    {w.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={MUTED}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works (header nav: #how-it-works) */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className={EYEBROW} style={PURPLE}>
              Simple. Direct. Local.
            </p>
            <h2 className={H2} style={INK}>
              How it works.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-10 text-left sm:grid-cols-3 sm:gap-8">
              {STEPS.map((s) => (
                <div key={s.number}>
                  <span
                    className={`${fredoka.className} flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold`}
                    style={{ backgroundColor: "#F1EBFB", color: "#6520B5" }}
                  >
                    {s.number}
                  </span>
                  <p className={`${fredoka.className} mt-3 font-semibold`} style={INK}>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={MUTED}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <a href="#launch-offer" data-cta-section="process" className="mt-10 inline-flex items-center gap-1.5 text-sm font-bold hover:underline" style={PURPLE}>
              See the launch offer →
            </a>
          </div>
        </section>

        {/* Made for local experience businesses */}
        <section className="bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
              Made for local experience businesses.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={MUTED}>
              You know your customers, your costs and your booking calendar better than anyone.
              MegaDeal gives Auckland businesses another way to get discovered. Whether you want to
              fill a few places on a tour, introduce a new workshop or encourage more midweek
              visits, choose an offer that suits your business.
            </p>
            <p className={`${fredoka.className} mt-5 text-xl font-semibold`} style={INK}>
              No commission. No need to discount everything. Just a good local offer and a clear way
              to book.
            </p>
          </div>
        </section>

        {/* Launch offer (header CTA and "See the launch offer": #launch-offer) */}
        <section id="launch-offer" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid grid-cols-1 items-center gap-8 rounded-3xl px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1.1fr_1fr]" style={{ backgroundColor: "#EEF6FC" }}>
              <div>
                <p className={EYEBROW} style={PURPLE}>
                  Auckland first
                </p>
                <h2 className={`${fredoka.className} mt-2 text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
                  {LAUNCHED ? "Get your business in front of Auckland." : "Get ready for Auckland’s launch."}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={MUTED}>
                  {LAUNCHED
                    ? "Create your business profile, prepare your offers and preview them before they go live."
                    : "Create your business profile and prepare your offers before MegaDeal opens to customers. Your free advertising period starts when the site goes live, so you can get set up now."}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold" style={INK}>
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4 text-[#6520B5]" /> 0% commission
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UnlockIcon className="h-4 w-4 text-[#6520B5]" /> No lock-in
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCardIcon className="h-4 w-4 text-[#6520B5]" /> No credit card required to sign up
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 text-center sm:p-8" style={LINE}>
                <p className={`${fredoka.className} text-xl font-semibold sm:text-2xl`} style={PURPLE}>
                  {OFFER}
                </p>
                <a href={SIGNUP_HREF} data-cta-section="launch_offer" className={`mt-5 flex w-full ${PRIMARY_BUTTON}`}>
                  List your business <span aria-hidden>→</span>
                </a>
                <p className="mt-3 text-xs font-semibold" style={INK}>
                  Launch offer code: {PROMO.code}. Subject to eligibility.
                </p>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed" style={MUTED}>
              {LAUNCHED ? "For eligible Auckland businesses." : "For eligible Auckland businesses applying before launch."} Current
              eligibility requires a New Zealand registered limited company. Subject to approval and fair use.{" "}
              <Link href={TERMS_HREF} className="underline hover:no-underline" style={PURPLE}>
                View offer terms.
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ (header nav: #questions) */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className={`text-center ${EYEBROW}`} style={PURPLE}>
              Let&rsquo;s make it clear
            </p>
            <h2 className={`${fredoka.className} mt-2 text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={INK}>
              A few things you might be wondering.
            </h2>

            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} name="things-to-do-faq" data-faq-question={f.q} className="group rounded-xl border bg-white p-5" style={LINE}>
                  <summary className="cursor-pointer list-none font-bold marker:content-none" style={INK}>
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={MUTED}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-center text-sm" style={MUTED}>
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

        {/* Final CTA — the hero's lavender panel again */}
        <section className="bg-white px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-6 py-10 text-center sm:rounded-3xl sm:px-12 sm:py-12">
            <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[26px] font-semibold leading-tight text-hp-ink [text-wrap:balance] sm:text-[32px]`}>
              Your next customer could be planning their next day out.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={MUTED}>
              Give them a reason to discover your experience.
            </p>
            <a href={SIGNUP_HREF} data-cta-section="final_cta" className={`mt-6 ${PRIMARY_BUTTON}`}>
              List your business <span aria-hidden>→</span>
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
