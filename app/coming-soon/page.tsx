import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import {
  CheckIcon,
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TicketIcon,
  UtensilsIcon,
  WrenchIcon,
} from "@/components/icons";

const TITLE = "MegaDeal Auckland Launch — Local Deals & Free Business Advertising";
const DESCRIPTION =
  "MegaDeal is launching in Auckland first. Deal hunters can join for launch updates, while eligible local businesses can claim up to 6 months free advertising with 0% commission on sales. Conditions apply.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const AUCKLAND_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Auckland_CBD_skyline_from_Waitemata_Harbour_entrance.jpg";

const categories = [
  {
    label: "Food & Drink",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    icon: UtensilsIcon,
  },
  {
    label: "Spas & Beauty",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
    icon: FlowerIcon,
  },
  {
    label: "Gyms & Fitness",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
    icon: DumbbellIcon,
  },
  {
    label: "Things to Do",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    icon: CompassIcon,
  },
  {
    label: "Getaways & Stays",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    icon: SuitcaseIcon,
  },
  {
    label: "Home & Auto Services",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
    icon: WrenchIcon,
  },
];

const businessBenefits = [
  "0% commission on every sale",
  "Up to 6 months advertising free*",
  "Customers deal directly with you",
  "Use deals to fill quieter periods",
];

const rollout = [
  ["Auckland", "First"],
  ["Wellington", "Next"],
  ["Christchurch", "Next"],
  ["Queenstown", "Next"],
  ["Hamilton", "Next"],
];

export default function ComingSoonPage() {
  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-slate-900`}>
      <section className="relative overflow-hidden bg-brand-700 px-5 pb-10 pt-8 text-white sm:px-8 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="pointer-events-none absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-ember-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px] xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <div className="grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 xl:gap-16">
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white ring-1 ring-white/20 sm:text-sm">
                Launching first in Auckland
              </span>

              <h1 className={`${fredoka.className} mt-5 max-w-[680px] text-[46px] font-bold leading-[0.96] tracking-[-0.04em] text-white sm:text-[62px] lg:text-[70px] xl:text-[76px]`}>
                Big local deals are on the way, Auckland.
              </h1>

              <p className="mt-5 max-w-[680px] text-base leading-7 text-brand-50 sm:text-lg">
                MegaDeal isn&apos;t live yet — we&apos;re building Auckland&apos;s launch crowd now, helping local businesses fill quieter times and giving deal hunters early access to standout local offers.
              </p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-extrabold text-white sm:text-base">
                <span>0% commission for businesses</span>
                <span aria-hidden>•</span>
                <span>Up to 6 months advertising free*</span>
              </div>
              <p className="mt-2 text-xs text-brand-100">*Conditions apply for eligible new business listings.</p>
            </div>

            <div className="relative mx-auto w-full max-w-[760px]">
              <div className="relative aspect-[1.2/0.82] overflow-hidden rounded-[32px] border-[6px] border-white/20 bg-brand-600 shadow-[0_28px_70px_rgba(45,9,94,0.32)]">
                <Image
                  src={AUCKLAND_IMAGE}
                  alt="Auckland CBD skyline and Sky Tower across Waitematā Harbour"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  className="object-cover object-[52%_48%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/35 via-transparent to-transparent" />
                <div className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-brand-700 shadow-sm sm:text-sm">
                  Auckland first
                </div>
                <div className="absolute bottom-5 left-5 rounded-[16px] bg-brand-900/90 px-4 py-3 backdrop-blur-sm">
                  <p className="font-extrabold text-white">Same city. More to discover.</p>
                  <p className="mt-0.5 text-xs text-brand-100 sm:text-sm">Local offers. Local businesses. Better value.</p>
                </div>
              </div>

              <Image
                src="/brand/deal-hunter-elephant.svg"
                alt="MegaDeal elephant hunting for big local deals"
                width={360}
                height={280}
                className="absolute -bottom-12 -right-7 z-20 w-[190px] drop-shadow-2xl sm:-bottom-16 sm:-right-8 sm:w-[240px] lg:w-[260px] xl:w-[285px]"
              />
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-14">
            <div className="flex min-h-[220px] flex-col rounded-[22px] bg-white p-6 text-slate-900 shadow-[0_18px_45px_rgba(45,9,94,0.20)] sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600">
                <TicketIcon className="h-6 w-6" />
              </span>
              <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-slate-900 sm:text-3xl`}>
                Be first in line for launch deals
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 sm:text-base">
                Join free for launch updates and early access to local offers when MegaDeal goes live in Auckland.
              </p>
              <a href="#get-notified" className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-ember-500 px-6 text-sm font-extrabold text-white transition hover:bg-ember-600">
                Get launch updates →
              </a>
            </div>

            <div className="flex min-h-[220px] flex-col rounded-[22px] bg-white p-6 text-slate-900 shadow-[0_18px_45px_rgba(45,9,94,0.20)] sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <StoreIcon className="h-6 w-6" />
              </span>
              <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-slate-900 sm:text-3xl`}>
                Turn quiet time into new customers
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 sm:text-base">
                Join before launch for <strong className="font-extrabold text-slate-900">0% commission</strong> and <strong className="font-extrabold text-slate-900">up to 6 months advertising free.*</strong>
              </p>
              <Link href="/list-your-business" className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-600">
                Claim my free advertising →
              </Link>
            </div>
          </div>

          <div className="mt-6 grid overflow-hidden rounded-[18px] bg-white text-slate-900 shadow-[0_12px_34px_rgba(45,9,94,0.16)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              [TicketIcon, "No vouchers to buy"],
              [StoreIcon, "Deal directly with local businesses"],
              [CheckIcon, "Support businesses in your city"],
              [MapPinIcon, "Auckland first • more NZ cities next"],
            ].map(([Icon, label], index) => {
              const ItemIcon = Icon as typeof TicketIcon;
              return (
                <div key={String(label)} className={`flex min-h-[84px] items-center gap-3 px-5 py-4 ${index < 3 ? "border-b border-slate-200 sm:border-b-0 lg:border-r" : ""} ${index === 1 ? "sm:border-l lg:border-l-0" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <ItemIcon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold leading-5">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px] xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <div className="text-center">
            <h2 className={`${fredoka.className} text-3xl font-bold text-slate-900 sm:text-4xl`}>How MegaDeal works</h2>
            <p className="mt-2 text-slate-600">Simple. Local. Great value.</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {[
              ["1", SearchIcon, "Find a deal", "Browse standout local offers across Auckland."],
              ["2", TicketIcon, "Get the deal code", "Unlock the offer and get your unique deal code."],
              ["3", PhoneIcon, "Book direct & enjoy", "Contact the business, quote your code and pay them directly."],
            ].map(([number, Icon, title, copy]) => {
              const StepIcon = Icon as typeof SearchIcon;
              return (
                <div key={String(title)} className="grid grid-cols-[40px_56px_1fr] items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember-500 text-sm font-extrabold text-white">{number as string}</span>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <StepIcon className="h-7 w-7" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{title as string}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{copy as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px] xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <div className="text-center">
            <h2 className={`${fredoka.className} text-3xl font-bold text-slate-900 sm:text-4xl`}>Explore the deals coming to Auckland</h2>
            <p className="mt-2 text-slate-600">A taste of what MegaDeal is being built to help you discover.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.label} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-[1.28/1] overflow-hidden bg-slate-100">
                    <Image src={category.image} alt={`Generic ${category.label.toLowerCase()} category image`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" className="object-cover" />
                  </div>
                  <div className="flex items-center gap-2 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-extrabold leading-4 text-slate-900 sm:text-sm">{category.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-2 xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-ember-50 to-brand-50 p-6 sm:p-8">
            <Image src="/brand/deal-hunter-elephant.svg" alt="" aria-hidden="true" width={220} height={170} className="pointer-events-none absolute -bottom-6 -left-7 w-[145px] opacity-95 sm:w-[175px]" />
            <div className="relative ml-0 sm:ml-[130px]">
              <h2 className={`${fredoka.className} text-3xl font-bold text-slate-900 sm:text-4xl`}>Be first in line for launch deals</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">Get launch updates and early access to local offers across Auckland.</p>
              <div className="mt-5 max-w-xl">
                <EmailSignupForm audience="customer" source="coming-soon" buttonLabel="Get launch updates →" accent="brand" surface="plain" />
                <p className="mt-2 text-xs text-slate-500">Free to join. No spam. Unsubscribe anytime.</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-brand-100 bg-brand-50 p-6 sm:p-8">
            <Image src="/brand/deal-hunter-elephant.svg" alt="" aria-hidden="true" width={220} height={170} className="pointer-events-none absolute -bottom-6 -right-5 w-[150px] opacity-90 sm:w-[180px]" />
            <div className="relative max-w-[78%] sm:max-w-[72%]">
              <h2 className={`${fredoka.className} text-3xl font-bold text-slate-900 sm:text-4xl`}>Fill quiet times. Grow local customers.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">Join before launch and start with a stronger deal.</p>
              <ul className="mt-4 grid gap-2.5">
                {businessBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-semibold text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white"><CheckIcon className="h-3.5 w-3.5" /></span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <Link href="/list-your-business" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-600">
                Claim my free advertising →
              </Link>
              <p className="mt-2 text-[11px] text-slate-500">*Conditions apply. Limited-time pre-launch offer for eligible new business listings.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px] rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm xl:max-w-[1320px] 2xl:max-w-[1460px]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Our launch plan</p>
              <h2 className={`${fredoka.className} mt-1 text-2xl font-bold text-slate-900 sm:text-3xl`}>Auckland first, then more Kiwi cities.</h2>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-5 lg:max-w-[760px]">
              {rollout.map(([city, status], index) => (
                <div key={city} className="text-center">
                  <span className={`mx-auto block h-3 w-3 rounded-full ${index === 0 ? "bg-ember-500" : "bg-slate-300"}`} />
                  <p className={`mt-2 text-sm font-extrabold ${index === 0 ? "text-slate-900" : "text-slate-600"}`}>{city}</p>
                  <p className="text-xs text-slate-500">({status})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
