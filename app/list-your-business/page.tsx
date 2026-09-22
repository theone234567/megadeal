import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import SampleDealCard from "@/components/SampleDealCard";
import EmailSignupForm from "@/components/EmailSignupForm";
import StickyApplyBar from "@/components/StickyApplyBar";
import ConversionTracker from "@/components/ConversionTracker";
import ViewContentTracker from "@/components/ViewContentTracker";
import MerchantSignupForm from "./MerchantSignupForm";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { getSignupStats } from "@/lib/publicStats";
import { fredoka, plusJakartaSans, caveat } from "@/lib/fonts";
import { PercentIcon, ZapIcon, MapPinIcon, CheckIcon, UtensilsIcon, FlowerIcon, TicketIcon, SuitcaseIcon, DumbbellIcon, WrenchIcon } from "@/components/icons";

// Re-checked at most once a minute — the counts only need to be
// approximately live, and this avoids hitting Wix on every single request.
export const revalidate = 60;

// The root layout's title.template ("%s | MegaDeal") already appends the
// brand name to whatever <title> a page sets — every other page's title
// omits "MegaDeal" for that reason, so this one does too, to avoid it
// rendering as "...— MegaDeal | MegaDeal". openGraph/twitter titles aren't
// run through that template (they're shown standalone, e.g. on social
// platforms), so those keep the full brand-inclusive version.
const LIST_YOUR_BUSINESS_TITLE = "Up to 6 Months Free Advertising for Auckland Businesses";
const LIST_YOUR_BUSINESS_SOCIAL_TITLE = `${LIST_YOUR_BUSINESS_TITLE} — MegaDeal`;
const LIST_YOUR_BUSINESS_DESCRIPTION =
  "Auckland businesses: claim up to 6 months free advertising on MegaDeal before launch. 0% commission, no lock-in, no credit card required.";

export const metadata: Metadata = {
  title: LIST_YOUR_BUSINESS_TITLE,
  description: LIST_YOUR_BUSINESS_DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/list-your-business` },
  // Without its own openGraph/twitter block this page silently inherits the
  // root layout's homepage title/description — mismatching the dedicated
  // opengraph-image.tsx built for this page, which already says "Up to 6
  // months free advertising".
  openGraph: {
    title: LIST_YOUR_BUSINESS_SOCIAL_TITLE,
    description: LIST_YOUR_BUSINESS_DESCRIPTION,
    url: `${SITE_URL}/list-your-business`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: LIST_YOUR_BUSINESS_SOCIAL_TITLE,
    description: LIST_YOUR_BUSINESS_DESCRIPTION,
  },
};

// The exact CTA used everywhere on this page — one wording, always
// scrolling to the signup form, so a visitor never has to work out which
// button is "the" button.
const CTA_LABEL = "CLAIM MY FREE ADVERTISING →";

// Same circled-checkmark treatment as the coming-soon page's Tick
// component — plain "✓ text" here was the only trust row on the site not
// using it, white-on-brand rather than that component's colored-circle
// version since this row sits directly on the dark hero background.
const HERO_TRUST_ITEMS = [
  "Up to 6 months free",
  "0% commission",
  "No lock-in",
  "No credit card required",
];

const WHY_JOIN_NOW = [
  {
    icon: "🎁",
    title: "Up to 6 months FREE",
    text: "Get started without paying an advertising fee during your introductory period.",
  },
  {
    icon: PercentIcon,
    title: "0% commission",
    text: "Customers deal directly with your business. MegaDeal does not take a percentage of your sales.",
  },
  {
    icon: MapPinIcon,
    title: "Reach local customers",
    text: "Get discovered by people searching for deals and things to do near them.",
  },
  {
    icon: ZapIcon,
    title: "Get in early",
    text: "Get featured before MegaDeal officially launches in Auckland.",
  },
];

const WHAT_YOU_GET = [
  {
    emoji: "📱",
    title: "A dedicated business listing",
    text: "Show your business name, photos, description, location, hours and links.",
  },
  {
    emoji: "🔥",
    title: "Deal listings",
    text: "Create genuine offers designed to give customers a reason to choose you.",
  },
  {
    emoji: "📍",
    title: "Local discovery",
    text: "Customers can find deals near them using MegaDeal's location features.",
  },
  {
    emoji: "⚡",
    title: "Flash Deals",
    text: "Have spare capacity today? Create a short-term offer to help fill it.",
  },
  {
    emoji: "🔗",
    title: "Direct customers",
    text: "Customers contact or book with your business directly.",
  },
  {
    emoji: "💰",
    title: "Keep your sales",
    text: "MegaDeal charges advertising fees/subscriptions — not a percentage of your sales.",
  },
];

// Names match lib/categories.ts's CATEGORIES exactly — the site's real
// storefront categories, not an independently-invented list that could
// drift from what /category/[name] and the nav actually show. Icons are
// this component's own line-icon set (components/icons.tsx), each picked
// to match the emoji CATEGORIES already uses for the same category
// elsewhere on the site (Food & Drink's 🍽️, Things To Do's 🎟️, etc).
//
// Each gets its own accent instead of one flat brand-purple circle
// repeated six times — six identical icons read as decoration, six
// distinct colours read as six different things, which is the point of
// having a per-category icon at all. Deliberately outside the brand
// purple/ember range (already carrying the page's CTAs and links) so
// these don't compete with or get mistaken for a clickable accent, and
// spread across the wheel (warm/cool alternating) rather than clustered,
// so adjacent cards in the 2-column grid never land on near-identical
// hues.
const BUSINESS_TYPES = [
  {
    icon: UtensilsIcon,
    label: "Food & Drink",
    href: "/advertise/restaurants",
    ctaLabel: "See how restaurants are using MegaDeal →",
    color: { bg: "bg-orange-100", icon: "text-orange-600" },
    description:
      "Give diners a reason to visit during your quieter services. From midweek set menus to lunch specials and café combos, create an offer that works for your kitchen and your customers.",
  },
  {
    icon: FlowerIcon,
    label: "Beauty & Spa",
    href: "/advertise/beauty-spa",
    ctaLabel: "See how beauty & spa businesses are using MegaDeal →",
    color: { bg: "bg-teal-100", icon: "text-teal-600" },
    description:
      "Make more of the gaps in your appointment book. Introduce new clients to your salon or spa with selected treatments, packages or a little extra with their booking.",
  },
  {
    icon: TicketIcon,
    label: "Things To Do",
    color: { bg: "bg-sky-100", icon: "text-sky-600" },
    description:
      "Bring more people to your tours, activities and experiences. Promote available spaces on selected dates and give locals a reason to try something different.",
  },
  {
    icon: SuitcaseIcon,
    label: "Travel & Getaways",
    color: { bg: "bg-indigo-100", icon: "text-indigo-600" },
    description:
      "Give guests a reason to book your quieter dates. Showcase your accommodation with a stay package, an added extra or an offer on selected nights.",
  },
  {
    icon: DumbbellIcon,
    label: "Health & Fitness",
    color: { bg: "bg-emerald-100", icon: "text-emerald-600" },
    description:
      "Introduce new customers to your gym, yoga studio, Pilates sessions or fitness classes. An introductory offer or class package can help them take the first step.",
  },
  {
    icon: WrenchIcon,
    label: "Home & Car",
    color: { bg: "bg-amber-100", icon: "text-amber-600" },
    description:
      "Turn available time in your schedule into opportunities for new bookings. Promote selected services or packages that help local customers discover what your business offers.",
  },
];

const FAQS = [
  {
    q: "Is MegaDeal really free?",
    a: "New qualifying businesses can receive up to 6 months of free advertising if they join before we launch. Conditions apply.",
  },
  {
    q: "Does MegaDeal take commission?",
    a: "No. MegaDeal does not take a percentage of your sales. Customers deal directly with your business.",
  },
  {
    q: "What happens after my free period?",
    a: "You'll be able to choose whether you want to continue advertising. There is no lock-in contract.",
  },
  {
    q: "Do I need to offer a discount?",
    a: "MegaDeal is designed around genuine deals and offers. Your offer can be a discount, a free extra, a package, an upgrade, or another genuine customer benefit.",
  },
  {
    q: "When will MegaDeal launch?",
    a: "MegaDeal is launching in Auckland first. Businesses that join before launch can prepare their listings and deals in advance — and it's the only time the up-to-6-months-free offer is available.",
  },
  {
    q: "How much will advertising cost after the free period?",
    a: "After your free period, MegaDeal is paid in simple advertising credits or a monthly subscription — never a percentage of your sales. Exact pricing is confirmed in your business portal before you're asked to pay anything, and you can cancel or pause at any time.",
  },
  {
    q: "Do customers pay MegaDeal?",
    a: "No. Customers deal directly with your business.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. There is no lock-in contract.",
  },
  {
    q: "Do I need a physical storefront?",
    a: "MegaDeal works best for local businesses with some spare capacity to fill — an off-peak dinner slot, a treatment room between appointments, seats on a tour that isn't full. We don't currently accept pure online/e-commerce stores or adult entertainment businesses.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Join",
    text: "Create your business account in minutes.",
  },
  {
    number: "2",
    title: "Create your deal",
    text: "Choose your offer, price, photo and terms.",
  },
  {
    number: "3",
    title: "Get discovered",
    text: "Customers find your business and contact or book with you directly.",
  },
];

// The live signup counter only starts appearing once there's a credible
// number of approved businesses — a count of 1 undercuts the trust it's
// meant to build more than showing nothing at all. This is a threshold,
// not a manual switch: it flips itself on automatically as real approvals
// cross it, no code change needed.
const MIN_APPROVED_BUSINESSES_TO_SHOW_STATS = 33;

// FAQS.a stays a plain string (it also feeds the FAQPage JSON-LD below,
// which needs plain text) — this only affects the visible rendering,
// turning a trailing "Conditions apply." into a link to /terms.
function renderFaqAnswer(a: string) {
  const suffix = " Conditions apply.";
  if (!a.endsWith(suffix)) return a;
  return (
    <>
      {a.slice(0, -suffix.length)}{" "}
      <Link href="/terms" className="text-brand-600 hover:underline">
        Conditions apply.
      </Link>
    </>
  );
}

function SectionCta({ section }: { section: string }) {
  return (
    <div className="mt-8 flex justify-center">
      <a
        href="#signup"
        data-cta-section={section}
        className="rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95"
      >
        {CTA_LABEL}
      </a>
    </div>
  );
}

export default async function MerchantsPage() {
  const rawStats = await getSignupStats();
  const stats =
    rawStats && rawStats.merchantCount >= MIN_APPROVED_BUSINESSES_TO_SHOW_STATS ? rawStats : null;

  return (
    <main className={plusJakartaSans.className}>
      <StickyApplyBar />
      <ConversionTracker />
      <ViewContentTracker contentName="list_your_business" />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Local business advertising",
            name: `${SITE_NAME} business advertising`,
            description:
              "Zero-commission advertising for local New Zealand businesses — customers pay the business directly, and MegaDeal is paid in advertising credits or a subscription, never a cut of sales.",
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            areaServed: { "@type": "Country", name: "New Zealand" },
            audience: {
              "@type": "BusinessAudience",
              audienceType: "Local businesses (restaurants, spas, activities, tours, getaways)",
            },
            url: `${SITE_URL}/list-your-business`,
            // Structured "Offer" for the pre-launch promo — the same thing
            // marked up in the FAQPage JSON-LD below, surfaced here too so
            // it's attached to the Service entity itself, not just an FAQ
            // answer, for search engines/AI answer engines that read one
            // but not the other.
            makesOffer: {
              "@type": "Offer",
              name: "Up to 6 months free advertising",
              description:
                "Up to 6 months of free advertising credits for qualifying businesses that join MegaDeal before launch, using code WELCOME6. Conditions apply.",
              price: "0",
              priceCurrency: "NZD",
              availability: "https://schema.org/LimitedAvailability",
              url: `${SITE_URL}/list-your-business`,
            },
          }),
        }}
      />

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-ember-600 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-card sm:text-base">
            🚀 Coming soon to Auckland — up to 6 months free before launch
          </span>

          <h1 className={`${fredoka.className} mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl text-white`}>
            Get your business in front of Auckland customers — for free.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            MegaDeal is launching in Auckland, and we&apos;re inviting
            local businesses to join before we do. Get up to 6 months
            of advertising free, pay 0% commission on your sales, and
            reach customers looking for great local deals.
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="#signup"
              data-cta-section="hero"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              {CTA_LABEL}
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm font-semibold text-brand-50">
            {HERO_TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-brand-700">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why join now — the offer, right after the hero, before anything
          else asks for attention. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Why join MegaDeal before launch?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            We&apos;re giving businesses that join before launch a better
            deal, because we want great local businesses on MegaDeal from
            day one.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 text-left sm:grid-cols-2">
            {WHY_JOIN_NOW.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl text-brand-700">
                  {typeof p.icon === "string" ? p.icon : <p.icon className="h-5 w-5" />}
                </span>
                <div>
                  <h3 className="font-display font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
          <SectionCta section="why_join_now" />
        </div>
      </section>

      {/* Economics example — makes "0% commission" concrete instead of
          abstract, right before the signup form asks for the ask. */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            No commission eating into your sale.
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                Customer spends
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-4xl">$49</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                MegaDeal commission
              </p>
              <p className="mt-2 text-2xl font-extrabold text-brand-600 sm:text-4xl">$0</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">
                Your business
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-4xl">$49</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
            MegaDeal is an advertising platform. We don&apos;t take a
            percentage of your sales.
          </p>
        </div>
      </section>

      {/* Signup — moved up so a ready visitor doesn't have to scroll
          through the whole page to apply. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Claim your free advertising
            </h2>
            <p className="mt-2 text-slate-600">
              List your Auckland business ahead of MegaDeal&apos;s launch
              and get up to six months of free advertising.*
            </p>
            <p className="mt-1 text-xs text-slate-500">
              *
              <Link href="/terms" className="underline hover:text-slate-600">
                T&amp;Cs apply.
              </Link>
            </p>
          </div>
          <div className="mt-8">
            <Suspense fallback={null}>
              <MerchantSignupForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Fit — for anyone who scrolled past the form to see if this is
          really built for them first. */}
      <section className="bg-brand-50 px-4 py-14 sm:px-6 lg:px-8">
        {/* Single container at every step — heading, intro, grid and closing
            line all share this exact left edge and max-width, so nothing
            in the section reads as its own narrower column. 1120px sits
            between this page's other two grid sections' max-w-5xl
            (1024px) and max-w-6xl — wide enough that two ~500px cards
            with this much copy get real room, without the row going so
            wide that a 2-column grid starts to feel sparse. */}
        <div className="mx-auto max-w-[1120px]">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Turn quieter times into new customers.
          </h2>
          <div className="mt-3 space-y-3 text-slate-600">
            <p>
              Every business has quieter moments — tables waiting to be
              filled, gaps in the appointment book, or a class with
              room for a few more people. Those spaces are an
              opportunity to introduce someone new to what you do best.
            </p>
            <p>
              MegaDeal gives you a simple way to promote offers that
              give locals a reason to choose your business. You decide
              what to offer, when it&apos;s available and the
              conditions that work for you, so you can focus on the
              days, times or services that could use a boost.
            </p>
            <p>
              It doesn&apos;t have to mean a big discount. A lunch
              combo, a treatment package, an introductory class or a
              complimentary extra can give customers a reason to try
              something new. Choose an offer that makes sense for your
              customers and your margins, then give them an experience
              worth coming back for.
            </p>
          </div>
          {/* Explicit repeat(2, minmax(0,1fr)) via Tailwind's grid-cols-2 —
              min-[700px] rather than the sm: breakpoint (640px) so the
              switch to one column happens closer to where these longer
              descriptions actually start feeling tight on their own line
              length, not at an arbitrary framework default. min-w-0 on
              every card stops its text/link from overflowing the grid
              track (the default min-width:auto on a grid item sizes it to
              its longest unbreakable content instead of the track). */}
          <div className="mt-8 grid grid-cols-1 gap-6 min-[700px]:grid-cols-2">
            {BUSINESS_TYPES.map((t) => (
              <div
                key={t.label}
                className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${t.color.bg}`}
                >
                  <t.icon className={`h-6 w-6 ${t.color.icon}`} />
                </span>
                {t.href ? (
                  <Link
                    href={t.href}
                    className={`${fredoka.className} mt-4 inline-flex w-fit items-center gap-1 rounded-sm text-xl text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2`}
                  >
                    {t.label}
                    <span aria-hidden className="text-brand-600">
                      →
                    </span>
                  </Link>
                ) : (
                  <h3 className={`${fredoka.className} mt-4 text-xl text-slate-900`}>{t.label}</h3>
                )}
                <p className="mt-2 text-base leading-[1.65] text-slate-600">
                  {t.description}
                  {t.href && (
                    <>
                      {" "}
                      <Link
                        href={t.href}
                        className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
                      >
                        {t.ctaLabel}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-600">
            <span className="font-bold text-slate-900">Don&apos;t see your business here?</span>{" "}
            We welcome enquiries from a wide range of local businesses.{" "}
            <Link
              href="/contact"
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
            >
              Get in touch
            </Link>{" "}
            and tell us what you offer.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            What does my business actually get?
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 text-left sm:grid-cols-2">
            {WHAT_YOU_GET.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                  {p.emoji}
                </span>
                <div>
                  <h3 className="font-display font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
          <SectionCta section="what_you_get" />
        </div>
      </section>

      {/* Preview mockup */}
      <section id="preview" className="scroll-mt-[140px] bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-600">
              A quick preview
            </span>
            <h2 className={`${fredoka.className} mt-2 text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Here&apos;s what customers will see
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-500">
              Your business gets more than just a name on a directory.
              Customers can see your deal, photos, location, business
              information and booking/contact options — all in one
              place.
            </p>
          </div>

          <div className="mt-8">
            <SampleDealCard />
          </div>

          <p className="mx-auto mt-4 max-w-md text-center text-sm font-semibold text-brand-700">
            Imagine this with YOUR business here.
          </p>
          <SectionCta section="preview" />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.number}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                  {s.number}
                </span>
                <h3 className="font-display mt-3 font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm font-semibold text-slate-700">
            That&apos;s it. No complicated setup.
          </p>
        </div>
      </section>

      {/* Trust — honest about being new, framed as a reason to join now
          rather than a weakness to hide. */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Be part of MegaDeal from day one.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            MegaDeal is launching in Auckland, and we&apos;re
            deliberately starting with a small group of local
            businesses so we can get it right before opening up further.
          </p>
          {stats && (stats.merchantCount > 0 || stats.waitlistCount > 0) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl border border-brand-100 bg-brand-50 px-6 py-5">
              {stats.merchantCount > 0 && (
                <p className="text-base font-semibold text-brand-800">
                  🏪 <span className="font-extrabold">{stats.merchantCount.toLocaleString()}</span> Auckland businesses already signed up
                </p>
              )}
              {stats.waitlistCount > 0 && (
                <p className="text-base font-semibold text-brand-800">
                  📧 <span className="font-extrabold">{stats.waitlistCount.toLocaleString()}</span> locals waiting for launch day
                </p>
              )}
            </div>
          )}
          <div className="mx-auto mt-6 max-w-xl space-y-4 text-left text-slate-600">
            <p>
              MegaDeal is New Zealand-owned and operated, and we&apos;re
              launching first in Auckland with a small group of local
              businesses. Our goal is simple: help people discover great
              local offers and give businesses a new way to reach
              customers.
            </p>
            <p>
              As a local business ourselves, we know every marketing
              dollar matters. Join before launch and get up to six
              months of free advertising, plus the opportunity to help
              shape the platform from the start.
            </p>
            <p>
              There&apos;s nothing to lose — it&apos;s completely free
              to join, with no credit card required, no commitment and
              0% commission.
            </p>
            <p>We&apos;d love you to be part of our launch.</p>
            <div className="pt-1">
              <p className={`${caveat.className} text-3xl leading-none text-brand-700`}>Nick</p>
              <p className="mt-1 text-sm text-slate-500">Founder, MegaDeal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pre-launch offer — real, time-based urgency (the offer ends at
          launch, not an invented headcount cap). */}
      <section className="bg-ember-600 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg font-extrabold text-white sm:text-xl">
            Pre-launch offer — up to 6 months free
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ember-50">
            The up-to-6-months-free offer is only available to
            qualifying businesses that join before deals go live on
            MegaDeal — use code{" "}
            <span className="font-bold">WELCOME6</span> at signup.{" "}
            <Link href="/terms" className="font-semibold text-white underline hover:no-underline">
              Conditions apply.
            </Link>
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="#signup"
              data-cta-section="founding_offer"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-ember-600 shadow-card transition active:scale-95 hover:bg-ember-50"
            >
              {CTA_LABEL}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className={`${fredoka.className} text-center text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Frequently asked questions
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                data-faq-question={f.q}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
              >
                <summary className="cursor-pointer list-none font-bold text-slate-900 marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span className="shrink-0 text-slate-500 transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{renderFaqAnswer(f.a)}</p>
              </details>
            ))}
          </div>
        </div>
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
      </section>

      {/* Still not ready — a genuine last resort, kept secondary and
          ahead of the real closing CTA below rather than being the page's
          final beat. */}
      <section className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm font-semibold text-slate-700">
            Still not ready to apply?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Leave your email and we&apos;ll let you know when we launch
            — no commitment.
          </p>
          <div className="mt-3">
            <EmailSignupForm
              audience="merchant"
              source="businesses-not-ready"
              buttonLabel="Notify me"
              accent="brand"
              surface="plain"
              center
            />
          </div>
        </div>
      </section>

      {/* Final CTA — the page's real ending. */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-white sm:text-3xl`}>
            Ready to get more local customers?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-brand-50">
            Join the businesses launching on MegaDeal. Get up to 6
            months free advertising.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-brand-100">
            0% commission. No lock-in. No credit card required.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="#signup"
              data-cta-section="final_cta"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-card transition active:scale-95 hover:bg-brand-50"
            >
              {CTA_LABEL}
            </a>
          </div>
          <p className="mt-6 text-sm text-brand-100">
            Got questions?{" "}
            <Link href="/contact" className="font-semibold text-white underline hover:no-underline">
              Flick us a message.
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
