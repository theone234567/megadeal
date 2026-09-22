import type { Metadata } from "next";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MascotFigure from "@/components/megadeal/MascotFigure";
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
import { SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { getMegadealArt } from "@/lib/megadealAssets";

// Same "was noindex while built from spec docs alone" precedent as
// /advertise/restaurants — flip to false only if this needs to go back to
// draft before real assets/copy are confirmed live.
const PAGE_LIVE_FOR_SEARCH = true;

const TITLE = "Beauty & Spa Advertising Auckland | 6 Months Free";
const DESCRIPTION =
  "Grow your Auckland beauty business with MegaDeal. Reach local customers with offers for nails, hair, spa, massage, facials, lashes and more. Join free for 6 months.";

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
    icon: HeartIcon,
    heading: "Nail Salons",
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
    icon: FlowerIcon,
    heading: "Day Spas",
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
    icon: ZapIcon,
    heading: "Hair Salons & Barbers",
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
    icon: LeafIcon,
    heading: "Facials, Skin & Beauty Therapy",
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
    icon: EyeIcon,
    heading: "Lashes & Brows",
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
    icon: ClockIcon,
    heading: "Massage",
    copy: "Massage businesses can use quieter appointment periods to introduce their treatments to more local customers. Create an offer around a selected massage, duration, day or package rather than discounting your entire service menu.",
    offerIdeas: ["Weekday massage", "First-visit massage offer", "60-minute treatment special", "Massage package"],
  },
  {
    id: "waxing-tanning",
    icon: FlameIcon,
    heading: "Waxing, Tanning & Other Beauty Services",
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

const EXAMPLE_DEALS = [
  { eyebrow: "NEW CLIENT", title: "First beauty treatment", offer: "20% off for new customers" },
  { eyebrow: "MIDWEEK", title: "Tuesday–Thursday", offer: "Selected facial special" },
  { eyebrow: "NAILS", title: "Gel manicure", offer: "Introductory new-client offer" },
  { eyebrow: "SPA", title: "Massage + facial", offer: "Weekday package" },
  { eyebrow: "LASHES & BROWS", title: "Lash lift or brow treatment", offer: "First-visit offer" },
  { eyebrow: "HAIR", title: "Cut, treatment or blow wave", offer: "Selected weekday promotion" },
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
    title: "6 Months Free",
    body: "Eligible Auckland businesses can join MegaDeal's launch offer and advertise free for their first six months.",
  },
  {
    icon: UnlockIcon,
    title: "You're in Control",
    body: "Choose the service or offer that makes sense for your business.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Join MegaDeal",
    body: "Tell us about your beauty, hair, nail, spa or wellness business.",
  },
  {
    number: "02",
    title: "Create Your Offer",
    body: "Choose something appealing that works commercially for your business.",
  },
  {
    number: "03",
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
  const art = getMegadealArt();

  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName="advertise_beauty_spa" />

      {/* Skip link — no site-wide equivalent to inherit, same precedent as
          /advertise/restaurants. */}
      <a
        href="#beauty-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6519C7] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id="beauty-main">
        {/* Hero */}
        <section
          id="hero"
          className="relative overflow-hidden text-white"
          style={{
            background:
              "radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%), linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)",
          }}
        >
          <div className="mx-auto grid max-w-[1184px] grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.08fr_1fr] lg:gap-[60px] lg:px-8 lg:pb-[85px] lg:pt-[78px]">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
                <FlowerIcon className="h-3.5 w-3.5" /> Beauty &amp; spa advertising in Auckland
              </p>
              <h1
                className={`${fredoka.className} mt-3 text-[40px] font-semibold leading-[1.08] sm:text-[52px] lg:text-[62px]`}
              >
                Fill more beauty &amp; spa{" "}
                <span style={{ color: "#ADDFFF" }}>appointments in Auckland.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg">
                Turn quieter appointment times into opportunities to meet new local customers.
                Whether you run a nail salon, hair salon, day spa, massage studio, beauty salon,
                facial and skin business, or lash and brow studio, MegaDeal gives you another way
                to put your business in front of Auckland locals looking for something great
                nearby.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#launch-offer"
                  data-cta-section="hero"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(200,18,135,.35)] transition hover:bg-[#DC168F] active:scale-95 sm:text-base"
                  style={{ backgroundColor: "#C81287" }}
                >
                  Get 6 months free →
                </a>
                <a
                  href="#how-it-works"
                  data-cta-section="hero_secondary"
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white px-6 py-3.5 text-sm font-extrabold text-[#5f1cc8] transition hover:border-white hover:bg-white/90 sm:text-base"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-semibold text-white/85">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> 0% commission
                </span>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> You choose the offer
                </span>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> Auckland first
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
              <div
                className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-[28px] shadow-[0_24px_48px_rgba(20,3,50,.4)] sm:h-[340px] lg:h-[427px]"
                style={{
                  transform: "rotate(2deg)",
                  background: "linear-gradient(160deg, #F5EFFC 0%, #ffffff 60%, #FCE9F4 100%)",
                }}
              >
                <MascotFigure
                  src={art.mascotBigDeals}
                  fallbackSrc="/brand/deal-hunter-elephant.svg"
                  alt="The MegaDeal mascot elephant, ready to help promote local beauty and spa offers"
                  width={360}
                  height={280}
                  priority
                  className="h-auto w-[65%] max-w-[260px] object-contain"
                />
              </div>

              {/* 0% commission sticker — same treatment as /advertise/restaurants */}
              <div className="absolute -left-4 top-6 flex items-baseline gap-1.5 rounded-2xl bg-white px-4 py-3 shadow-card sm:-left-6">
                <span className="text-3xl font-extrabold leading-none" style={{ color: "#241138" }}>
                  0%
                </span>
                <span className="text-xs font-semibold leading-tight" style={{ color: "#706178" }}>
                  commission.
                  <br />
                  More stays with you.
                </span>
              </div>

              {/* Auckland launch label — same treatment as /advertise/restaurants */}
              <div
                className="absolute -bottom-3 -right-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-card sm:-right-4"
                style={{ backgroundColor: "#ADDFFF", color: "#1e293b" }}
              >
                <MapPinIcon className="h-3.5 w-3.5" />
                Launching first in <strong className="font-extrabold">Auckland</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Category chips — anchor down to the matching subcategory section */}
        <nav aria-label="Beauty & spa categories" className="border-b bg-white" style={{ borderColor: "#E8E1EF" }}>
          <div className="mx-auto max-w-[1184px] overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            <ul className="flex w-max min-w-full items-center gap-2.5 sm:flex-wrap sm:w-auto">
              {CATEGORY_CHIPS.map((c) => (
                <li key={c.href}>
                  <a
                    href={c.href}
                    className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-[#6519C7]/40 hover:bg-[#F5EFFC]"
                    style={{ borderColor: "#E8E1EF", color: "#241138" }}
                  >
                    <c.icon className="h-4 w-4 text-[#6519C7]" />
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Section 1 — the core commercial idea */}
        <section className="bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px] text-center">
            <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              An empty appointment can&rsquo;t be sold tomorrow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "#706178" }}>
              Restaurants have empty tables. Beauty businesses have empty appointment slots. Once
              an appointment time passes, that opportunity is gone. MegaDeal gives beauty and spa
              businesses another way to make quieter times work harder — by creating an
              attractive local offer that can introduce new people to your business.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              {INTRO_CARDS.map((c) => (
                <div key={c.title} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={{ color: "#241138" }}>
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2 — one substantial block per category, each its own
            heading + anchor, matched to the chips above. */}
        <section className="px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[1184px]">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
                Every kind of beauty business
              </p>
              <h2 className={`${fredoka.className} mt-2 text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
                Built for beauty &amp; spa businesses.
              </h2>
              <p className="mt-3 text-base leading-relaxed" style={{ color: "#706178" }}>
                Not every beauty business works the same way. That is why your promotion
                shouldn&rsquo;t have to look the same either.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {SUBCATEGORIES.map((s) => (
                <div
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-[100px] rounded-[24px] border bg-white p-7 shadow-card"
                  style={{ borderColor: "#E8E1EF" }}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                  >
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className={`${fredoka.className} mt-4 text-xl font-semibold`} style={{ color: "#241138" }}>
                    {s.heading}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {s.copy}
                  </p>
                  {s.offerIdeas && (
                    <div className="mt-4 rounded-xl border border-dashed p-3.5" style={{ borderColor: "#E8E1EF" }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#706178" }}>
                        Example offer ideas
                      </p>
                      <ul className="mt-1.5 space-y-1 text-sm" style={{ color: "#241138" }}>
                        {s.offerIdeas.map((idea) => (
                          <li key={idea} className="flex items-start gap-1.5">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: "#6519C7" }} />
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — promote smarter, not just cheaper */}
        <section className="bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              A smarter kind of promotion
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              Don&rsquo;t discount everything. Promote smarter.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: "#706178" }}>
              A good beauty promotion doesn&rsquo;t need to mean making your whole business
              cheaper. The aim is to give someone a compelling reason to discover your business.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2">
              {SMARTER_CARDS.map((c) => (
                <div key={c.title} className="flex items-start gap-4 rounded-[24px] border p-6 shadow-card" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold" style={{ color: "#241138" }}>
                      {c.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "#706178" }}>
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — example offer ideas */}
        <section className="px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              Need inspiration?
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              Beauty promotion ideas.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
              {EXAMPLE_DEALS.map((d) => (
                <div key={d.eyebrow + d.title} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: "#E8E1EF" }}>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6519C7" }}>
                    {d.eyebrow}
                  </p>
                  <p className={`${fredoka.className} mt-1 text-lg font-semibold`} style={{ color: "#241138" }}>
                    {d.title}
                  </p>
                  <div className="mt-4 rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: "#E8E1EF" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#706178" }}>Example offer</p>
                    <p className="mt-0.5 text-sm font-bold" style={{ color: "#241138" }}>
                      {d.offer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-xs" style={{ color: "#706178" }}>
              Examples are for inspiration only. Each participating business chooses its own
              offer, availability and applicable conditions.
            </p>
          </div>
        </section>

        {/* Section 5 — the first visit is the beginning, not the whole story */}
        <section className="bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              Give someone a reason to try you.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#706178" }}>
              Finding a new salon, nail technician, spa or beauty therapist can feel like a big
              decision. A strong introductory offer reduces the barrier to trying somewhere new.
              But the first appointment is only the beginning. Your service, experience and
              relationship with the customer are what can turn that introduction into repeat
              business. MegaDeal helps with the introduction.
            </p>
            <p className={`${fredoka.className} mt-5 text-2xl font-semibold`} style={{ color: "#6519C7" }}>
              You take it from there.
            </p>
          </div>
        </section>

        {/* Section 6 — Why MegaDeal (nav target: #why-megadeal) */}
        <section id="why-megadeal" className="scroll-mt-[100px] px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              More opportunity. Less commission.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              Why MegaDeal?
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MEGADEAL.map((w) => (
                <div key={w.title} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                  >
                    <w.icon className="h-5 w-5" />
                  </span>
                  <p className={`${fredoka.className} mt-4 font-semibold`} style={{ color: "#241138" }}>
                    {w.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {w.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7 — How it works (nav target: #how-it-works) */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              Simple. Direct. Local.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              How it works.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-10 text-left sm:grid-cols-3 sm:gap-8">
              {STEPS.map((s) => (
                <div key={s.number}>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ backgroundColor: "#6519C7" }}
                  >
                    {s.number}
                  </span>
                  <p className={`${fredoka.className} mt-3 font-semibold`} style={{ color: "#241138" }}>
                    {s.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="#launch-offer"
              data-cta-section="process"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
              style={{ color: "#6519C7" }}
            >
              Get 6 months free →
            </a>
          </div>
        </section>

        {/* Section 8 — made for local beauty businesses */}
        <section className="px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className={`${fredoka.className} text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              Made for local beauty businesses.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#706178" }}>
              MegaDeal isn&rsquo;t about telling you how to run your salon. You know your
              customers, your margins and your appointment book better than anyone. We simply
              want to give great Auckland businesses another way to get discovered. So whether
              you&rsquo;re trying to fill a few midweek nail appointments, introduce a new
              facial, promote quieter massage sessions or attract more first-time salon clients,
              MegaDeal can help put your offer in front of local customers.
            </p>
            <p className={`${fredoka.className} mt-5 text-xl font-semibold`} style={{ color: "#6519C7" }}>
              No commission. No need to discount everything. Just a good local offer from a good
              local business.
            </p>
          </div>
        </section>

        {/* Section 9 — Auckland First / main launch offer (nav + CTA target: #launch-offer) */}
        <section id="launch-offer" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <div
              className="relative rounded-[32px] px-6 py-12 text-white sm:px-12 sm:py-14"
              style={{
                background:
                  "radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%), linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)",
              }}
            >
              {/* Small supporting mascot in the corner — same placement rule
                  as /advertise/restaurants: fully inside the box, no
                  negative offset against overflow-hidden. */}
              <div className="pointer-events-none absolute right-4 top-4 hidden sm:block">
                <MascotFigure
                  src={art.mascotWave}
                  fallbackSrc="/brand/megadeal-elephant.svg"
                  alt=""
                  width={200}
                  height={156}
                  className="h-auto w-[110px] opacity-90 sm:w-[140px]"
                />
              </div>

              <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/75">
                    Auckland first
                  </p>
                  <h2 className={`${fredoka.className} mt-2 text-[28px] font-semibold leading-tight sm:text-[36px]`}>
                    Get in early. Build your presence.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                    MegaDeal is starting where we&rsquo;re local — Auckland. We&rsquo;re building
                    a marketplace where Aucklanders can discover deals and experiences from
                    restaurants, beauty businesses, salons, spas and other great businesses
                    around the city. Be there when Auckland starts discovering MegaDeal.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white/85">
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="h-4 w-4" /> 0% commission
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UnlockIcon className="h-4 w-4" /> No lock-in
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CreditCardIcon className="h-4 w-4" /> No credit card
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] bg-white/10 p-6 text-center backdrop-blur-sm sm:p-8">
                  <p
                    className="mx-auto inline-block rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white"
                    style={{ backgroundColor: "#C81287" }}
                  >
                    Up to 6 months free advertising
                  </p>
                  <a
                    href={SIGNUP_HREF}
                    data-cta-section="launch_offer"
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold shadow-card transition hover:bg-white/90 active:scale-95 sm:text-base"
                    style={{ color: "#6519C7" }}
                  >
                    Join MegaDeal — 6 months free →
                  </a>
                  <p className="mt-3 text-xs font-semibold text-white/80">
                    Use WELCOME6 at signup.
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    Continue to MegaDeal&rsquo;s business signup
                  </p>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed" style={{ color: "#706178" }}>
              For eligible Auckland businesses applying before launch. Current eligibility
              requires a New Zealand registered limited company. Subject to approval and fair
              use.{" "}
              <Link href="/terms" className="underline hover:no-underline" style={{ color: "#6519C7" }}>
                View offer terms.
              </Link>{" "}
              Run a restaurant or café instead?{" "}
              <Link href="/advertise/restaurants" className="underline hover:no-underline" style={{ color: "#6519C7" }}>
                See restaurant advertising.
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ (nav target: #questions) */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-3xl">
            <p className="text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              Let&rsquo;s make it clear
            </p>
            <h2 className={`${fredoka.className} mt-2 text-center text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              A few things you might be wondering.
            </h2>

            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  name="beauty-spa-faq"
                  data-faq-question={f.q}
                  className="group rounded-2xl border bg-white p-5 shadow-card"
                  style={{ borderColor: "#E8E1EF" }}
                >
                  <summary className="cursor-pointer list-none font-bold marker:content-none" style={{ color: "#241138" }}>
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-center text-sm" style={{ color: "#706178" }}>
              Have a question about your beauty business?{" "}
              <Link href="/contact" className="font-bold hover:underline" style={{ color: "#6519C7" }}>
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

        {/* Final CTA — same gradient-panel language as #launch-offer, no id
            of its own since nothing needs to anchor to it. */}
        <section className="bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px]">
            <div
              className="relative rounded-[32px] px-6 py-12 text-center text-white sm:px-12 sm:py-14"
              style={{
                background:
                  "radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%), linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)",
              }}
            >
              <h2 className={`${fredoka.className} mx-auto max-w-2xl text-[28px] font-semibold leading-tight sm:text-[36px]`}>
                Your next customer could be looking for a new salon right now.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                Give them a reason to discover yours.
              </p>
              <a
                href={SIGNUP_HREF}
                data-cta-section="final_cta"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold shadow-card transition hover:bg-white/90 active:scale-95 sm:text-base"
                style={{ color: "#6519C7" }}
              >
                Get started free →
              </a>
              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm font-semibold text-white/85">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> 0% commission
                </span>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4" /> Auckland first
                </span>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <span className="flex items-center gap-1.5">
                  <HeartIcon className="h-4 w-4" /> Built for local businesses
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Mobile fixed CTA — same pattern as /advertise/restaurants */}
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:hidden"
          style={{ borderColor: "#E8E1EF", paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <p className="text-sm font-bold" style={{ color: "#241138" }}>
            Up to <span style={{ color: "#6519C7" }}>6 months free</span>
          </p>
          <a
            href="#launch-offer"
            data-cta-section="mobile_sticky"
            className="rounded-full px-5 py-2.5 text-sm font-extrabold text-white"
            style={{ backgroundColor: "#C81287" }}
          >
            List my business
          </a>
        </div>
        {/* Reserve space so the fixed bar never covers the footer's own links. */}
        <div className="h-16 sm:hidden" aria-hidden />
      </div>
    </main>
  );
}
