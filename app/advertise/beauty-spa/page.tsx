import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  EyeIcon,
  FlameIcon,
  FlowerIcon,
  HeartIcon,
  LeafIcon,
  MapPinIcon,
  MegaphoneIcon,
  PercentIcon,
  TicketIcon,
  UnlockIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/icons";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

// Same "was noindex while built from spec docs alone" precedent as
// /advertise/restaurants — flip to false only if this needs to go back to
// draft before real assets/copy are confirmed live.
const PAGE_LIVE_FOR_SEARCH = true;

const TITLE = "Beauty & Spa Advertising Auckland";
const DESCRIPTION =
  "Reach Auckland customers with offers for nails, hair, spa, massage and more. 0% commission, and up to 6 months free advertising for eligible businesses.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/advertise/beauty-spa` },
  robots: PAGE_LIVE_FOR_SEARCH ? undefined : { index: false, follow: false },
  openGraph: {
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
    url: `${SITE_URL}/advertise/beauty-spa`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
  },
};

// Same signup route and default-promo behaviour /advertise/restaurants
// already relies on — MerchantSignupForm's promo field defaults to
// WELCOME6 with no query param needed (see MerchantSignupForm.tsx's
// `useState(referralPrefill || "WELCOME6")`).
const SIGNUP_HREF = "/list-your-business#signup";

// Hero layers, each replaceable on its own. The photo is the "MegaDeal
// Website Images" pack's facial treatment (AI-generated illustration, not
// a participating business), sized from the pack's master; the mascot is
// the approved hoodie elephant the coming-soon page uses (transparent).
const HERO_PHOTO = {
  src: "/images/beauty-spa/beauty-hero-facial-treatment.webp",
  small: "/images/beauty-spa/beauty-hero-facial-treatment-720.webp",
  alt: "Beauty therapist giving a client a facial treatment in a calm spa room",
  position: "60% 40%",
};
const HERO_MASCOT = { src: "/megadeal/coming-soon-v2/mascot-hoodie.webp" };

const CATEGORY_CHIPS = [
  { href: "#nail-salons", label: "Nail Salons", icon: HeartIcon },
  { href: "#day-spas", label: "Day Spas", icon: FlowerIcon },
  { href: "#hair-salons", label: "Hair Salons", icon: ZapIcon },
  { href: "#massage", label: "Massage", icon: ClockIcon },
  { href: "#facials-beauty", label: "Facials & Beauty", icon: LeafIcon },
  { href: "#lashes-brows", label: "Lashes & Brows", icon: EyeIcon },
  { href: "#waxing-tanning", label: "Waxing & Tanning", icon: FlameIcon },
] as const;

const INTRO_CARDS = [
  {
    icon: ClockIcon,
    title: "Fill Quieter Times",
    body: "Create an offer around the days, services or appointment periods where you want more customers.",
  },
  {
    icon: UsersIcon,
    title: "Find New Local Customers",
    body: "Get your business in front of Aucklanders looking for beauty, spa, hair and self-care experiences.",
  },
  {
    icon: UnlockIcon,
    title: "Stay in Control",
    body: "You decide what you want to promote and what makes sense for your business.",
  },
] as const;

// Each entry is its own real heading + genuinely distinct copy, not one
// paragraph with the category name swapped in — the brief this page was
// built from was explicit that a search engine (and a salon owner
// skimming for their own category) can tell the difference.
const SUBCATEGORIES = [
  {
    id: "nail-salons",
    heading: "Nail Salons",
    image: "/images/beauty-spa/beauty-nails.webp",
    imageAlt: "Pink manicure at a beauty salon",
    copy: "Promote manicures, pedicures, gel nails, acrylics, nail art and other treatments to people looking for their next nail appointment. A MegaDeal offer could be particularly useful for attracting first-time customers or adding bookings during quieter weekday periods.",
    offerIdeas: [
      "Gel manicure introductory offer",
      "Midweek manicure + pedicure package",
      "New-client nail treatment",
      "Quiet-day nail special",
    ],
  },
  {
    id: "day-spas",
    heading: "Day Spas",
    image: "/images/beauty-spa/beauty-spa.webp",
    imageAlt: "Spa towels, candles and flowers in a relaxing treatment room",
    copy: "A beautiful treatment room sitting empty doesn't generate revenue. Use selected spa experiences to introduce more local customers to your business without needing to discount every treatment you offer. Potential promotions could include massages, facials, spa packages or selected weekday experiences.",
    offerIdeas: [
      "Weekday spa package",
      "Massage + facial combination",
      "First-visit treatment offer",
      "Spa experience for two",
    ],
  },
  {
    id: "hair-salons",
    heading: "Hair Salons & Barbers",
    image: "/images/beauty-spa/beauty-hair.webp",
    imageAlt: "Styled hair in a modern beauty salon",
    copy: "Turn quieter appointment periods into an opportunity to bring someone new through the door. Promote selected cuts, styling, blow waves, treatments or selected colour services while protecting the times and services that are already busy.",
    offerIdeas: [
      "Midweek cut and style",
      "First-visit salon offer",
      "Blow-wave package",
      "Selected weekday treatment",
    ],
  },
  {
    id: "facials-beauty",
    heading: "Facials, Skin & Beauty Therapy",
    image: "/images/beauty-spa/beauty-facial.webp",
    imageAlt: "Facial beauty treatment in a spa",
    copy: "Give new clients a reason to discover your treatment menu. Beauty therapists and non-medical skin businesses can promote selected facials, beauty treatments and introductory packages while keeping control over the offer.",
    offerIdeas: [
      "New-client facial",
      "Facial + beauty treatment package",
      "Weekday treatment special",
      "Introductory beauty package",
    ],
  },
  {
    id: "lashes-brows",
    heading: "Lashes & Brows",
    image: "/images/beauty-spa/beauty-lashes.webp",
    imageAlt: "Professional lash and brow beauty treatment",
    copy: "Lashes and brows are highly visual services, and a strong introductory offer can give someone a reason to try a new local business. Use MegaDeal to promote selected treatments when you have capacity.",
    offerIdeas: [
      "Lash lift introductory offer",
      "Brow shape + tint package",
      "New-client lash treatment",
      "Quiet-day beauty special",
    ],
  },
  {
    id: "massage",
    heading: "Massage",
    image: "/images/beauty-spa/beauty-massage.webp",
    imageAlt: "Relaxing massage treatment in a spa",
    copy: "Massage businesses can use quieter appointment periods to introduce their treatments to more local customers. Create an offer around a selected massage, duration, day or package rather than discounting your entire service menu.",
    offerIdeas: ["Weekday massage", "First-visit massage offer", "60-minute treatment special", "Massage package"],
  },
  {
    id: "waxing-tanning",
    heading: "Waxing, Tanning & Other Beauty Services",
    image: "/images/beauty-spa/beauty-waxing.webp",
    imageAlt: "Professional beauty waxing treatment",
    copy: "MegaDeal isn't limited to large salons. If you provide a professional local beauty service, there may be an opportunity to showcase it to more Auckland customers. Your promotion can focus on the service you most want people to discover.",
    offerIdeas: null,
  },
] as const;

const SMARTER_CARDS = [
  {
    icon: CalendarIcon,
    title: "Target Quieter Appointment Periods",
    body: "If Friday evening is already booked, don't discount Friday evening. Consider an offer that encourages bookings on Tuesday afternoon instead.",
  },
  {
    icon: TicketIcon,
    title: "Choose a Service That Introduces Your Business",
    body: "An introductory facial, manicure, massage, blow wave or lash treatment can be a customer's first experience with your business. Make that first visit count.",
  },
  {
    icon: CheckIcon,
    title: "Protect Your Busiest Services",
    body: "You don't have to promote everything. Choose the service, package or time that makes commercial sense for you.",
  },
  {
    icon: MegaphoneIcon,
    title: "Make the Offer Easy to Understand",
    body: "Customers should immediately understand what they're getting and why it's worthwhile. Simple usually wins.",
  },
] as const;

// imageAlt is deliberately distinct from each image's own SUBCATEGORIES
// imageAlt above (even though several reuse the same file) — it describes
// the promo-card context here (an example offer), not the category section,
// and gives Google Images a specific, non-duplicate string per card.
const EXAMPLE_DEALS = [
  {
    eyebrow: "NEW CLIENT",
    title: "First beauty treatment",
    offer: "20% off for new customers",
    image: "/images/beauty-spa/beauty-facial.webp",
    imageAlt: "New-client facial offer at an Auckland beauty spa",
  },
  {
    eyebrow: "MIDWEEK",
    title: "Tuesday–Thursday",
    offer: "Selected facial special",
    image: "/images/beauty-spa/beauty-spa.webp",
    imageAlt: "Midweek spa treatment room offer in Auckland",
  },
  {
    eyebrow: "NAILS",
    title: "Gel manicure",
    offer: "Introductory new-client offer",
    image: "/images/beauty-spa/beauty-nails.webp",
    imageAlt: "Gel manicure offer at an Auckland nail salon",
  },
  {
    eyebrow: "SPA",
    title: "Massage + facial",
    offer: "Weekday package",
    image: "/images/beauty-spa/beauty-massage.webp",
    imageAlt: "Massage and facial package offer at an Auckland day spa",
  },
  {
    eyebrow: "LASHES & BROWS",
    title: "Lash lift or brow treatment",
    offer: "First-visit offer",
    image: "/images/beauty-spa/beauty-lashes.webp",
    imageAlt: "Lash and brow treatment offer at an Auckland beauty salon",
  },
  {
    eyebrow: "HAIR",
    title: "Cut, treatment or blow wave",
    offer: "Selected weekday promotion",
    image: "/images/beauty-spa/beauty-hair.webp",
    imageAlt: "Hair salon promotion offer in Auckland",
  },
] as const;

const WHY_MEGADEAL = [
  {
    icon: MapPinIcon,
    title: "Local Customers",
    body: "MegaDeal is launching in Auckland first, with a focus on connecting locals with businesses around them.",
  },
  {
    icon: PercentIcon,
    title: "0% Commission",
    body: "MegaDeal doesn't take a commission from the offers you promote through the platform.",
  },
  {
    icon: CreditCardIcon,
    title: "Up to 6 Months Free",
    body: "Eligible Auckland businesses that join before launch can get up to six months of free advertising.",
  },
  {
    icon: UnlockIcon,
    title: "You're in Control",
    body: "Choose the service or offer that makes sense for your business.",
  },
] as const;

const STEPS = [
  {
    number: "1",
    title: "Join MegaDeal",
    body: "Tell us about your beauty, hair, nail, spa or wellness business.",
  },
  {
    number: "2",
    title: "Create Your Offer",
    body: "Choose something appealing that works commercially for your business.",
  },
  {
    number: "3",
    title: "Reach More Locals",
    body: "Give Auckland customers another reason to discover your business.",
  },
] as const;

// `a` is the plain-text answer that feeds the FAQPage JSON-LD below — same
// single-source-of-truth pattern app/advertise/restaurants/page.tsx uses.
// Cost/commission/eligibility answers are worded to match that page's own
// FAQ exactly (same terms, same offer), not restated from scratch.
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does it cost to advertise my beauty business on MegaDeal?",
    a: "MegaDeal is currently offering eligible Auckland businesses up to six months of free advertising as part of our launch offer. Use WELCOME6 at signup.",
  },
  {
    q: "Does MegaDeal take commission?",
    a: "MegaDeal charges 0% commission on offers promoted through the platform, and there is no lock-in contract.",
  },
  {
    q: "What types of beauty businesses can join?",
    a: "MegaDeal is designed for a broad range of local beauty and wellness businesses, including nail salons, hair salons, barbers, day spas, massage businesses, beauty therapists, facial and skin businesses, lash and brow studios, waxing businesses and other eligible beauty services.",
  },
  {
    q: "Do I have to discount every service?",
    a: "No. The idea is to promote an offer that makes sense for your business. That could be a selected treatment, introductory package, quieter appointment period or another promotion you choose.",
  },
  {
    q: "Can I use MegaDeal to fill quieter appointment times?",
    a: "That is one of the main reasons beauty businesses may find MegaDeal useful. Instead of reducing prices during your busiest periods, consider creating an offer around the capacity you actually want to fill.",
  },
  {
    q: "Is MegaDeal only available in Auckland?",
    a: "MegaDeal is launching in Auckland first.",
  },
  {
    q: "Is MegaDeal only for large salons?",
    a: "No. MegaDeal is designed for local businesses of different sizes, subject to MegaDeal's current business eligibility requirements.",
  },
  {
    q: "What are the current eligibility requirements?",
    a: "Under the current terms, your business must be a New Zealand registered limited company. Sole traders and partnerships are not currently eligible. Business applications and offers are reviewed before approval.",
  },
];

export default function BeautySpaAdvertisingPage() {
  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName="advertise_beauty_spa" />
      {/* Service entity for this specific offering — see the matching
          block on /advertise/restaurants. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Beauty and spa advertising",
            name: `${SITE_NAME} beauty & spa advertising`,
            description:
              "Zero-commission advertising for Auckland nail salons, day spas, hair salons, barbers, beauty therapists, lash and brow studios and massage businesses. Customers book and pay the business directly; MegaDeal never takes a cut of sales.",
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "City", name: "Auckland" },
            audience: {
              "@type": "BusinessAudience",
              audienceType: "Nail salons, day spas, hair salons, barbers, beauty therapists, lash and brow studios, massage businesses",
            },
            url: `${SITE_URL}/advertise/beauty-spa`,
            makesOffer: {
              "@type": "Offer",
              name: "Up to 6 months free advertising",
              description:
                "Up to 6 months of free advertising credits for qualifying businesses that join MegaDeal before its Auckland launch, using code WELCOME6. Conditions apply.",
              price: "0",
              priceCurrency: "NZD",
              availability: "https://schema.org/LimitedAvailability",
              url: `${SITE_URL}/advertise/beauty-spa`,
            },
          }),
        }}
      />

      {/* Skip link — no site-wide equivalent to inherit, same precedent as
          /advertise/restaurants. */}
      <a
        href="#beauty-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6520B5] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id="beauty-main">
        {/* Hero — the coming-soon page's treatment: a pale lavender rounded
            panel in white space, text left and photo right (text and the
            main button first on phones). The photo and the mascot are
            separate layers, each replaceable on its own (HERO_PHOTO,
            HERO_MASCOT above). */}
        <section id="hero" className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
          <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-8 rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-5 py-7 sm:rounded-3xl sm:px-9 sm:py-10 md:grid-cols-[1.12fr_1fr] md:gap-8 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-hp-purple">
                For Auckland beauty &amp; spa businesses
              </p>
              <h1
                className={`${fredoka.className} mt-3 text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-hp-ink [text-wrap:balance] sm:text-[40px] md:text-[34px] lg:text-[46px] xl:text-[50px]`}
              >
                Fill quiet times.{" "}
                <span className="block text-hp-purple">Welcome new local clients.</span>
              </h1>
              <p className="mt-4 max-w-[34rem] text-base leading-relaxed sm:text-lg md:text-base lg:text-lg" style={{ color: "#334155" }}>
                Put your salon, spa or beauty business in front of Auckland locals looking for their
                next treatment. You choose the offer. Customers book and pay you directly.
              </p>
              <p className={`${fredoka.className} mt-5 text-xl font-semibold text-hp-purple sm:text-2xl`}>
                Up to 6 months free advertising*
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={SIGNUP_HREF}
                  data-cta-section="hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                >
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
              <p className="mt-2 text-xs" style={{ color: "#475569" }}>
                *For eligible businesses that join before launch.{" "}
                <Link href="/terms" className="font-semibold text-hp-purple underline underline-offset-2 hover:no-underline">
                  Terms apply.
                </Link>
              </p>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white">
                <picture>
                  <source media="(min-width: 640px)" srcSet={HERO_PHOTO.src} width={1200} height={900} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_PHOTO.small}
                    alt={HERO_PHOTO.alt}
                    width={720}
                    height={540}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: HERO_PHOTO.position }}
                  />
                </picture>
                {/* Decorative: standing at the photo's lower-right edge, his
                    lower half hidden by the frame, clear of the face. */}
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

        {/* Category chips — anchor down to the matching subcategory section */}
        <nav aria-label="Beauty & spa categories" className="border-b bg-white" style={{ borderColor: "#E8E1EF" }}>
          <div className="mx-auto max-w-[1240px] overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            <ul className="flex w-max min-w-full items-center gap-2.5 sm:flex-wrap sm:w-auto">
              {CATEGORY_CHIPS.map((c) => (
                <li key={c.href}>
                  <a
                    href={c.href}
                    className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition hover:border-[#6520B5]/40 hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                    style={{ borderColor: "#E8E1EF", color: "#0F172A" }}
                  >
                    <c.icon className="h-4 w-4 text-[#6520B5]" />
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Section 1 — the core commercial idea */}
        <section className="bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              Beauty &amp; Spa Advertising in Auckland
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              An empty appointment can&rsquo;t be sold tomorrow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "#475569" }}>
              Restaurants have empty tables. Beauty businesses have empty appointment slots. Once
              an appointment time passes, that opportunity is gone. MegaDeal gives beauty and spa
              businesses another way to make quieter times work harder — by creating an
              attractive local offer that can introduce new people to your business.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              {INTRO_CARDS.map((c) => (
                <div key={c.title} className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={{ color: "#0F172A" }}>
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2 — one substantial block per category, each its own
            heading + anchor, matched to the chips above. */}
        <section className="bg-hp-lavender px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
                Every kind of beauty business
              </p>
              <h2 className={`${fredoka.className} mt-2 text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
                Built for beauty &amp; spa businesses.
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={{ color: "#475569" }}>
                Not every beauty business works the same way. That is why your promotion
                shouldn&rsquo;t have to look the same either.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {SUBCATEGORIES.map((s) => (
                <div
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-[100px] overflow-hidden rounded-xl border bg-white"
                  style={{ borderColor: "#E8E1EF" }}
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={s.image}
                      alt={s.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-7">
                    <h3 className={`${fredoka.className} text-xl font-semibold`} style={{ color: "#0F172A" }}>
                      {s.heading}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "#475569" }}>
                      {s.copy}
                    </p>
                    {s.offerIdeas && (
                      <div className="mt-4 rounded-xl border border-dashed p-3.5" style={{ borderColor: "#E8E1EF" }}>
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
                          Example offer ideas
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm" style={{ color: "#0F172A" }}>
                          {s.offerIdeas.map((idea) => (
                            <li key={idea} className="flex items-start gap-1.5">
                              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: "#6520B5" }} />
                              {idea}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — promote smarter, not just cheaper */}
        <section className="bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              A smarter kind of promotion
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              Don&rsquo;t discount everything. Promote smarter.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: "#475569" }}>
              A good beauty promotion doesn&rsquo;t need to mean making your whole business
              cheaper. The aim is to give someone a compelling reason to discover your business.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
              {SMARTER_CARDS.map((c) => (
                <div key={c.title} className="flex items-start gap-4 rounded-xl border bg-white p-6" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold" style={{ color: "#0F172A" }}>
                      {c.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "#475569" }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — example offer ideas */}
        <section className="bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              Need inspiration?
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              Beauty promotion ideas.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
              {EXAMPLE_DEALS.map((d) => (
                <div key={d.eyebrow + d.title} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8E1EF" }}>
                  <div className="relative aspect-[16/10] w-full">
                    <Image
                      src={d.image}
                      alt={d.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6520B5" }}>
                      {d.eyebrow}
                    </p>
                    <p className={`${fredoka.className} mt-1 text-lg font-semibold`} style={{ color: "#0F172A" }}>
                      {d.title}
                    </p>
                    <div className="mt-4 rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: "#E8E1EF" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#475569" }}>Example offer</p>
                      <p className="mt-0.5 text-sm font-bold" style={{ color: "#0F172A" }}>
                        {d.offer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-xs" style={{ color: "#475569" }}>
              Examples are for inspiration only. Each participating business chooses its own
              offer, availability and applicable conditions.
            </p>
          </div>
        </section>

        {/* Section 5 — the first visit is the beginning, not the whole story */}
        <section className="bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              Give someone a reason to try you.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#475569" }}>
              Finding a new salon, nail technician, spa or beauty therapist can feel like a big
              decision. A strong introductory offer reduces the barrier to trying somewhere new.
              But the first appointment is only the beginning. Your service, experience and
              relationship with the customer are what can turn that introduction into repeat
              business. MegaDeal helps with the introduction.
            </p>
            <p className={`${fredoka.className} mt-5 text-2xl font-semibold`} style={{ color: "#0F172A" }}>
              You take it from there.
            </p>
          </div>
        </section>

        {/* Section 6 — Why MegaDeal (nav target: #why-megadeal) */}
        <section id="why-megadeal" className="scroll-mt-[100px] bg-hp-lavender px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              More opportunity. Less commission.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              Why MegaDeal?
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MEGADEAL.map((w) => (
                <div key={w.title} className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6520B5" }}
                  >
                    <w.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={{ color: "#0F172A" }}>
                    {w.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7 — How it works (nav target: #how-it-works) */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              Simple. Direct. Local.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
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
                  <p className={`${fredoka.className} mt-3 font-semibold`} style={{ color: "#0F172A" }}>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="#launch-offer"
              data-cta-section="process"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
              style={{ color: "#6520B5" }}
            >
              See the launch offer →
            </a>
          </div>
        </section>

        {/* Section 8 — made for local beauty businesses */}
        <section className="bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              Made for local beauty businesses.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#475569" }}>
              MegaDeal isn&rsquo;t about telling you how to run your salon. You know your
              customers, your margins and your appointment book better than anyone. We simply
              want to give great Auckland businesses another way to get discovered. So whether
              you&rsquo;re trying to fill a few midweek nail appointments, introduce a new
              facial, promote quieter massage sessions or attract more first-time salon clients,
              MegaDeal can help put your offer in front of local customers.
            </p>
            <p className={`${fredoka.className} mt-5 text-xl font-semibold`} style={{ color: "#0F172A" }}>
              No commission. No need to discount everything. Just a good local offer from a good
              local business.
            </p>
          </div>
        </section>

        {/* Section 9 — Auckland First / main launch offer (nav + CTA target: #launch-offer) */}
        <section id="launch-offer" className="scroll-mt-[100px] bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1240px]">
            {/* The coming-soon page's business panel: pale blue, dark text,
                one clear purple signup button. */}
            <div className="grid grid-cols-1 items-center gap-8 rounded-3xl px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1.1fr_1fr]" style={{ backgroundColor: "#EEF6FC" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
                  Auckland first
                </p>
                <h2 className={`${fredoka.className} mt-2 text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
                  Get in early. Build your presence.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#475569" }}>
                  MegaDeal is starting where we&rsquo;re local — Auckland. We&rsquo;re building
                  a marketplace where Aucklanders can discover deals and experiences from
                  restaurants, beauty businesses, salons, spas and other great businesses
                  around the city. Be there when Auckland starts discovering MegaDeal.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold" style={{ color: "#0F172A" }}>
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4 text-[#6520B5]" /> 0% commission
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UnlockIcon className="h-4 w-4 text-[#6520B5]" /> No lock-in
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCardIcon className="h-4 w-4 text-[#6520B5]" /> No credit card
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 text-center sm:p-8" style={{ borderColor: "#E8E1EF" }}>
                <p className={`${fredoka.className} text-xl font-semibold sm:text-2xl`} style={{ color: "#6520B5" }}>
                  Up to 6 months free advertising
                </p>
                <a
                  href={SIGNUP_HREF}
                  data-cta-section="launch_offer"
                  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-hp-purple px-6 py-3 text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
                >
                  List your business <span aria-hidden>→</span>
                </a>
                <p className="mt-3 text-xs font-semibold" style={{ color: "#0F172A" }}>
                  Use WELCOME6 at signup.
                </p>
                <p className="mt-1 text-xs" style={{ color: "#475569" }}>
                  Continue to MegaDeal&rsquo;s business signup
                </p>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed" style={{ color: "#475569" }}>
              For eligible Auckland businesses applying before launch. Current eligibility
              requires a New Zealand registered limited company. Subject to approval and fair
              use.{" "}
              <Link href="/terms" className="underline hover:no-underline" style={{ color: "#6520B5" }}>
                View offer terms.
              </Link>{" "}
              Run a restaurant or café instead?{" "}
              <Link href="/advertise/restaurants" className="underline hover:no-underline" style={{ color: "#6520B5" }}>
                See restaurant advertising.
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ (nav target: #questions) */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-14 sm:py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#6520B5" }}>
              Let&rsquo;s make it clear
            </p>
            <h2 className={`${fredoka.className} mt-2 text-center text-[26px] font-semibold leading-tight [text-wrap:balance] sm:text-[32px]`} style={{ color: "#0F172A" }}>
              A few things you might be wondering.
            </h2>

            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  name="beauty-spa-faq"
                  data-faq-question={f.q}
                  className="group rounded-xl border bg-white p-5"
                  style={{ borderColor: "#E8E1EF" }}
                >
                  <summary className="cursor-pointer list-none font-bold marker:content-none" style={{ color: "#0F172A" }}>
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-center text-sm" style={{ color: "#475569" }}>
              Have a question about your beauty business?{" "}
              <Link href="/contact" className="font-bold hover:underline" style={{ color: "#6520B5" }}>
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

        {/* Final CTA — the hero's lavender panel again, closing the page. */}
        <section className="bg-white px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
          <div className="mx-auto max-w-[1240px] rounded-[20px] bg-gradient-to-br from-hp-lavender via-hp-lavender to-[#ECE4FA] px-6 py-10 text-center sm:rounded-3xl sm:px-12 sm:py-12">
            <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[26px] font-semibold leading-tight text-hp-ink [text-wrap:balance] sm:text-[32px]`}>
              Your next customer could be looking for a new salon right now.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: "#475569" }}>
              Give them a reason to discover yours.
            </p>
            <a
              href={SIGNUP_HREF}
              data-cta-section="final_cta"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-hp-purple px-7 py-3 text-base font-bold text-white transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2"
            >
              Get started free <span aria-hidden>→</span>
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
