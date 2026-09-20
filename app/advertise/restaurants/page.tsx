import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MascotFigure from "@/components/megadeal/MascotFigure";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  MapPinIcon,
  ReceiptIcon,
  TicketIcon,
  UnlockIcon,
  UsersIcon,
  UtensilsIcon,
} from "@/components/icons";
import { SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { getMegadealArt } from "@/lib/megadealAssets";

// Was noindex/nofollow while the page was still built from spec docs
// alone (no real photo, approximated layout details). Flipped to
// indexable now that it uses the real supplied assets and matches the
// reference screenshots, matching /list-your-business's own precedent
// of being indexable pre-launch (see app/sitemap.ts's unconditional
// staticPages — business-recruitment pages target a different audience
// than the consumer-facing pages still gated behind SITE_LAUNCHED).
const PAGE_LIVE_FOR_SEARCH = true;

const TITLE = "Restaurant Advertising Auckland";
const DESCRIPTION =
  "Promote your Auckland restaurant or café with MegaDeal. Apply before launch for up to six months of free advertising and 0% commission. T&Cs apply.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/advertise/restaurants` },
  robots: PAGE_LIVE_FOR_SEARCH ? undefined : { index: false, follow: false },
  openGraph: {
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
    url: `${SITE_URL}/advertise/restaurants`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | MegaDeal`,
    description: DESCRIPTION,
  },
};

// Signup already defaults its promo field to WELCOME6 without any query
// param (see MerchantSignupForm.tsx's `useState(referralPrefill ||
// "WELCOME6")`) — so this is accurate today, not a claim to prefill.
const SIGNUP_HREF = "/list-your-business#signup";

// `a` is the plain-text answer — the single source of truth, and what
// feeds the FAQPage JSON-LD below. Two answers additionally need an
// embedded /terms link on screen; `render`, when present, is what's
// actually shown instead of the bare string (matching the pattern
// app/list-your-business/page.tsx already uses for its own FAQ + terms
// link, rather than duplicating the wording between a display version and
// a structured-data version).
const FAQS: { q: string; a: string; render?: React.ReactNode }[] = [
  {
    q: "Do I have to offer a big discount?",
    a: "No. Your offer can be a set-menu package, a complimentary extra, an upgrade or a discount. It just needs to offer genuine value. Choose something that makes sense for your restaurant and your margins.",
  },
  {
    q: "Who handles the bookings and payments?",
    a: "You do. Diners find your offer on MegaDeal, get a deal code, then contact or book with your restaurant directly. They quote the code and pay you. There are no MegaDeal vouchers for customers to buy.",
  },
  {
    q: "Can I focus on my quieter days?",
    a: "Yes. Set out the days, times, availability and conditions in your offer. For example, you could offer a midweek set menu or an early dinner special. Make any booking requirements and exclusions clear before your deal goes live.",
  },
  {
    q: "What happens after the free advertising?",
    // "or a monthly subscription" (from the handoff's suggested wording)
    // is dropped here — this codebase's actual model, confirmed against
    // app/api/merchants/apply/route.ts and the Merchants schema throughout
    // this project, is advertising credits only. No subscription tier
    // exists to describe accurately, so this doesn't claim one does.
    a: "You can choose whether to continue. Advertising after your free period is paid for through advertising credits, with pricing shown in your business portal before you are asked to pay. MegaDeal takes 0% commission on sales, and there is no lock-in contract.",
  },
  {
    q: "Which restaurants can apply?",
    a: "MegaDeal is launching in Auckland first. Under the current terms, your business must be a New Zealand registered limited company. Sole traders and partnerships are not currently eligible. Business applications and offers are reviewed before approval.",
  },
  {
    q: "How do I get up to six months free?",
    a: "Apply before MegaDeal's Auckland launch and use WELCOME6 at signup. The offer is for qualifying businesses, is subject to approval and fair use, and provides up to six months of free advertising credits. See the full offer terms for details.",
    render: (
      <>
        Apply before MegaDeal&rsquo;s Auckland launch and use WELCOME6 at
        signup. The offer is for qualifying businesses, is subject to
        approval and fair use, and provides up to six months of free
        advertising credits. See the full offer terms for details.{" "}
        <Link href="/terms" className="text-[#6519C7] underline hover:no-underline">
          Read the terms.
        </Link>
      </>
    ),
  },
  {
    q: "Is MegaDeal already live?",
    a: "MegaDeal is preparing to launch in Auckland. You can apply now and get your restaurant listing and offers ready ahead of launch. Joining early gives you time to prepare; it is not a guarantee of bookings or sales.",
  },
];

const BENEFITS = [
  {
    icon: ClockIcon,
    title: "Make your quiet times more inviting",
    body: "Build an offer around the lunches, early evenings or midweek services that need a boost.",
  },
  {
    icon: UsersIcon,
    title: "Keep the customer relationship",
    body: "Diners contact and pay your restaurant directly. You take it from first booking to next visit.",
  },
  {
    icon: TicketIcon,
    title: "Create an offer that works for you",
    body: "A set menu, a free extra or a special price. You choose the value, availability and conditions.",
  },
] as const;

const OFFER_IDEAS = [
  {
    icon: CalendarIcon,
    eyebrow: "MIDWEEK",
    title: "Make Tuesday a dinner date.",
    body: "A set menu for two can give diners an easy reason to book on a quieter night.",
    idea: "Two mains + a shared side",
    note: "Available on the days you choose",
  },
  {
    icon: ClockIcon,
    eyebrow: "EARLY EVENINGS",
    title: "Give the early tables a boost.",
    body: "Offer a little extra for diners who arrive before your busiest service begins.",
    idea: "A complimentary starter",
    note: "With a main, during selected times",
  },
  {
    icon: UtensilsIcon,
    eyebrow: "CAFÉS & LUNCH SPOTS",
    title: "Become their new lunch spot.",
    body: "A simple lunch combo can introduce nearby diners to something they'll come back for.",
    idea: "Your signature lunch + a coffee",
    note: "One package, one clear price",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Apply before launch",
    body: (
      <>
        Create your business account and use <strong>WELCOME6</strong> to
        apply for the introductory advertising offer.
      </>
    ),
  },
  {
    number: "02",
    title: "Put your best offer forward",
    body: "Add your restaurant, photos and deal. Set your price, available times and terms, ready for review.",
  },
  {
    number: "03",
    title: "Welcome diners directly",
    body: "Once your deal is live, diners get a code, book or contact you directly, and pay your restaurant.",
  },
] as const;

export default function RestaurantAdvertisingPage() {
  const art = getMegadealArt();

  return (
    <main className={plusJakartaSans.className}>
      <ConversionTracker />
      <ViewContentTracker contentName="advertise_restaurants" />

      {/* Skip link — this page has no site-wide equivalent to inherit, so
          it's scoped here rather than added to the global layout. */}
      <a
        href="#restaurant-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#6519C7] focus:shadow-card"
      >
        Skip to main content
      </a>

      <div id="restaurant-main">
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
                <UtensilsIcon className="h-3.5 w-3.5" /> For Auckland restaurants &amp; cafés
              </p>
              <h1
                className={`${fredoka.className} mt-3 text-[40px] font-semibold leading-[1.08] sm:text-[52px] lg:text-[62px]`}
              >
                Turn quieter tables into{" "}
                <span style={{ color: "#ADDFFF" }}>new regulars.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg">
                Give locals a reason to try your restaurant. Join MegaDeal
                before launch for up to six months of free advertising, with{" "}
                <strong className="font-bold text-white">
                  0% commission on your sales.
                </strong>
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <a
                  href="#launch-offer"
                  data-cta-section="hero"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(200,18,135,.35)] transition hover:bg-[#DC168F] active:scale-95 sm:text-base"
                  style={{ backgroundColor: "#C81287" }}
                >
                  Claim my free advertising →
                </a>
                <div className="flex items-center gap-3 text-sm font-semibold text-white/85">
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4" /> No credit card
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckIcon className="h-4 w-4" /> No lock-in
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-white/60">
                For eligible businesses joining before launch.{" "}
                <Link href="/terms" className="underline decoration-white/40 underline-offset-2 hover:text-white/90 hover:decoration-white/90">
                  T&amp;Cs apply.
                </Link>
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
              <div
                className="relative h-[280px] overflow-hidden rounded-[28px] shadow-[0_24px_48px_rgba(20,3,50,.4)] sm:h-[340px] lg:h-[427px]"
                style={{ transform: "rotate(2deg)" }}
              >
                <Image
                  src="/megadeal/restaurants/restaurant-hero.webp"
                  alt="A wood-fired pizza and a burrata salad on a restaurant table"
                  fill
                  sizes="(min-width: 1024px) 420px, 90vw"
                  className="object-cover"
                  priority
                />
              </div>

              {/* 0% commission sticker */}
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

              {/* Auckland launch label */}
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

        {/* Confidence strip */}
        <section className="border-b" style={{ backgroundColor: "#F5EFFC", borderColor: "#E8E1EF" }}>
          <div className="mx-auto flex max-w-[1184px] flex-col items-center gap-4 px-4 py-6 text-sm font-semibold sm:flex-row sm:justify-center sm:gap-10 sm:px-6 lg:px-8" style={{ color: "#241138" }}>
            <span className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-[#6519C7]" /> New Zealand owned &amp; operated
            </span>
            <span className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 text-[#6519C7]" /> Customers pay you directly
            </span>
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#6519C7]" /> Your offers. Your terms.
            </span>
          </div>
        </section>

        {/* Benefits + commission illustration */}
        <section id="why-megadeal" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-[1184px] grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
                More opportunity. Less commission.
              </p>
              <h2 className={`${fredoka.className} mt-2 text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
                You bring the food. Give locals a reason to come.
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "#706178" }}>
                You know which tables need filling. MegaDeal gives your
                restaurant a place to promote genuine offers to people looking
                for somewhere to eat in Auckland.
              </p>

              <div className="mt-8 space-y-6">
                {BENEFITS.map((b) => (
                  <div key={b.title} className="flex items-start gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                    >
                      <b.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold" style={{ color: "#241138" }}>
                        {b.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "#706178" }}>
                        {b.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission receipt illustration */}
            <div className="rounded-[28px] border p-8" style={{ backgroundColor: "#F5EFFC", borderColor: "#E8E1EF" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
                A simple difference
              </p>
              <h3 className={`${fredoka.className} mt-2 text-2xl font-semibold`} style={{ color: "#241138" }}>
                Your food. Your service. Your sale.
              </h3>

              <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <ReceiptIcon className="h-4 w-4" /> The MegaDeal way
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-dashed pb-3" style={{ borderColor: "#E8E1EF" }}>
                    <dt style={{ color: "#706178" }}>A customer spends</dt>
                    <dd className="font-bold" style={{ color: "#241138" }}>$100</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed pb-3" style={{ borderColor: "#E8E1EF" }}>
                    <dt style={{ color: "#706178" }}>MegaDeal commission</dt>
                    <dd className="font-bold" style={{ color: "#6519C7" }}>$0</dd>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <dt className="font-bold" style={{ color: "#241138" }}>Paid directly to your restaurant</dt>
                    <dd className="text-lg font-extrabold" style={{ color: "#241138" }}>$100</dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-xl px-3 py-2 text-center text-xs font-bold" style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}>
                  No percentage taken from your sales
                </p>
              </div>

              <p className="mt-4 text-xs leading-relaxed" style={{ color: "#706178" }}>
                Illustrative sale, before your own costs. Advertising fees may
                apply after your free period.
              </p>
            </div>
          </div>
        </section>

        {/* Offer ideas */}
        <section className="px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              Your restaurant. Your kind of deal.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              A good offer doesn&rsquo;t have to mean a big discount.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: "#706178" }}>
              Start with a reason to visit, at a time that works for your
              business.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              {OFFER_IDEAS.map((o) => (
                <div key={o.eyebrow} className="rounded-[24px] border bg-white p-6 shadow-card" style={{ borderColor: "#E8E1EF" }}>
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#F5EFFC", color: "#6519C7" }}
                  >
                    <o.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: "#6519C7" }}>
                    {o.eyebrow}
                  </p>
                  <p className={`${fredoka.className} mt-1 text-lg font-semibold`} style={{ color: "#241138" }}>
                    {o.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {o.body}
                  </p>
                  <div className="mt-4 rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: "#E8E1EF" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Example idea</p>
                    <p className="mt-0.5 text-sm font-bold" style={{ color: "#241138" }}>{o.idea}</p>
                    <p className="text-xs" style={{ color: "#706178" }}>{o.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-xs" style={{ color: "#706178" }}>
              Ideas for inspiration, not live offers. Choose pricing and terms
              that work for your business.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1184px] text-center">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6519C7" }}>
              Simple. Direct. Local.
            </p>
            <h2 className={`${fredoka.className} mx-auto mt-2 max-w-2xl text-[32px] font-semibold leading-tight sm:text-[39px]`} style={{ color: "#241138" }}>
              From your kitchen to their next night out.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: "#706178" }}>
              No vouchers for diners to buy. No commission on your sales.
            </p>

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
              Get my restaurant ready for launch →
            </a>
          </div>
        </section>

        {/* Main launch offer */}
        <section id="launch-offer" className="scroll-mt-[100px] px-4 py-[94px] sm:px-6 lg:px-8" style={{ backgroundColor: "#FAF8FD" }}>
          <div className="mx-auto max-w-[1184px]">
            <div
              className="relative rounded-[32px] px-6 py-12 text-white sm:px-12 sm:py-14"
              style={{
                background:
                  "radial-gradient(ellipse at 90% 0%, #813ada 0%, transparent 53%), linear-gradient(120deg, #3c087d 0%, #6416bf 62%, #7020c7 100%)",
              }}
            >
              {/* Small supporting mascot in the corner — hidden on very
                  small screens so it never competes with the offer text.
                  No `overflow-hidden` on the panel and no negative offset
                  here: that combination is what clipped the mascot on the
                  portal sign-in screen earlier in this project (any
                  negative translate/inset against an overflow-hidden
                  ancestor gets cut in a straight line, regardless of how
                  small the offset is) — kept fully inside the box instead. */}
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
                    The Auckland launch offer
                  </p>
                  <h2 className={`${fredoka.className} mt-2 text-[28px] font-semibold leading-tight sm:text-[36px]`}>
                    A new way to get discovered. Your first months are on us.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
                    Apply before MegaDeal launches in Auckland and get up to{" "}
                    <strong className="font-bold text-white">
                      six months of free advertising.
                    </strong>{" "}
                    Put your restaurant on the menu for local deal hunters.
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
                    Claim my free advertising →
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
              For qualifying Auckland businesses applying before launch.
              Current eligibility requires a New Zealand registered limited
              company. Subject to approval and fair use.{" "}
              <Link href="/terms" className="underline hover:no-underline" style={{ color: "#6519C7" }}>
                View offer terms.
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="questions" className="scroll-mt-[100px] bg-white px-4 py-[94px] sm:px-6 lg:px-8">
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
                  name="restaurant-faq"
                  data-faq-question={f.q}
                  className="group rounded-2xl border p-5 shadow-card"
                  style={{ borderColor: "#E8E1EF" }}
                >
                  <summary className="cursor-pointer list-none font-bold marker:content-none" style={{ color: "#241138" }}>
                    <span className="flex items-center justify-between gap-4">
                      {f.q}
                      <span className="shrink-0 text-slate-400 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "#706178" }}>
                    {f.render ?? f.a}
                  </p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-center text-sm" style={{ color: "#706178" }}>
              Have a question about your restaurant?{" "}
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

        {/* Short local statement */}
        <section className="px-4 py-16 text-center sm:px-6 lg:px-8" style={{ backgroundColor: "#F5EFFC" }}>
          <p className="text-sm font-semibold" style={{ color: "#706178" }}>
            New Zealand owned. Auckland first.
          </p>
          <p className={`${fredoka.className} mt-1 text-xl font-semibold`} style={{ color: "#241138" }}>
            Built to help great local businesses get discovered.
          </p>
        </section>

        {/* Mobile fixed CTA — small screens only, matches the guide's
            "compact fixed CTA on small screens" (desktop already has the
            sticky header's own CTA, so this isn't needed above ~640px). */}
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
            List my restaurant
          </a>
        </div>
        {/* Reserve space so the fixed bar never covers the footer's own links. */}
        <div className="h-16 sm:hidden" aria-hidden />
      </div>
    </main>
  );
}
