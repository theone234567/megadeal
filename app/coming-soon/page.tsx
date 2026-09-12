import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import {
  CheckIcon,
  FlowerIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TicketIcon,
  UtensilsIcon,
  WrenchIcon,
  UsersIcon,
} from "@/components/icons";

const TITLE = "MegaDeal Auckland — Big Local Deals Are On The Way";
const DESCRIPTION =
  "MegaDeal is launching in Auckland first. Join for launch updates or claim up to 6 months free advertising with 0% commission for eligible new business listings.";

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
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const AUCKLAND_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Auckland_CBD_skyline_from_Waitemata_Harbour_entrance.jpg";

const categories = [
  {
    label: "Food & Drink",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=82",
    icon: UtensilsIcon,
  },
  {
    label: "Spas & Beauty",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1000&q=82",
    icon: FlowerIcon,
  },
  {
    label: "Things to Do",
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1000&q=82",
    icon: TicketIcon,
  },
  {
    label: "Getaways & Stays",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=82",
    icon: SuitcaseIcon,
  },
  {
    label: "Home & Auto Services",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=82",
    icon: WrenchIcon,
  },
];

const launchCities = [
  ["Auckland", "First"],
  ["Wellington", "Next"],
  ["Christchurch", "Next"],
  ["Queenstown", "Next"],
  ["Hamilton", "Next"],
];

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-[#292243]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d24dc] text-white">
        <CheckIcon className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

const pageWidth = "mx-auto w-full max-w-[1180px] xl:max-w-[1380px] 2xl:max-w-[1480px]";

export default function ComingSoonPage() {
  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-[#171128]`}>
      <section className="relative isolate overflow-visible bg-[radial-gradient(circle_at_16%_10%,#a947ff_0%,#8d30f4_28%,#711bdd_58%,#5d16c7_100%)] text-white">
        <div className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-[#b04cff]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#a947ff]/20 blur-3xl" />

        <div className={`${pageWidth} relative z-10 px-5 pb-28 pt-10 sm:px-8 lg:px-10 lg:pb-32 lg:pt-10`}>
          <div className="grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 xl:gap-16">
            <div className="lg:pb-5">
              <div className="inline-flex rounded-full bg-white/14 px-5 py-2 text-xs font-extrabold uppercase tracking-[0.19em] ring-1 ring-white/15 backdrop-blur-sm sm:text-sm">
                Launching first in Auckland
              </div>

              <h1 className={`${fredoka.className} mt-5 max-w-[660px] text-[48px] font-bold leading-[0.94] tracking-[-0.045em] sm:text-[62px] lg:text-[70px] xl:text-[78px]`}>
                Big local deals are on the way, Auckland.
              </h1>

              <p className="mt-5 max-w-[620px] text-[16px] leading-7 text-white/95 sm:text-[18px] sm:leading-8 xl:text-[19px]">
                MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet times and helping deal hunters discover standout local offers.
              </p>

              <p className="mt-4 max-w-[650px] text-sm font-extrabold sm:text-base xl:text-[17px]">
                0% commission for businesses <span className="mx-2 text-white/55">•</span> Up to 6 months advertising free*
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[760px] lg:max-w-none">
              <div className="relative aspect-[1.34/1] overflow-hidden rounded-[32px] border-[5px] border-white/85 bg-white/10 shadow-[0_26px_70px_rgba(35,7,82,0.30)] xl:rounded-[36px]">
                <img
                  src={AUCKLAND_IMAGE}
                  alt="Auckland skyline and Sky Tower across Waitematā Harbour"
                  className="h-full w-full object-cover object-[50%_50%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#25104a]/14 via-transparent to-transparent" />
                <div className="absolute right-5 top-5 rounded-full bg-white px-5 py-2 text-xs font-extrabold uppercase tracking-[0.13em] text-[#6418c9] shadow-sm sm:text-sm xl:right-7 xl:top-7">
                  Auckland first
                </div>
                <div className={`${fredoka.className} absolute right-[12%] top-[14%] hidden -rotate-6 text-right text-[30px] font-semibold leading-[1.05] text-white drop-shadow lg:block xl:text-[34px]`}>
                  Auckland<br />first!
                </div>
                <div className="absolute bottom-5 right-5 max-w-[340px] rounded-[16px] bg-[#321373]/94 px-5 py-3.5 text-white shadow-lg backdrop-blur-sm xl:bottom-7 xl:right-7 xl:max-w-[390px]">
                  <p className={`${fredoka.className} text-base font-bold sm:text-lg xl:text-xl`}>Same city. More to discover.</p>
                  <p className="mt-1 text-xs text-white/85 sm:text-sm">Local offers. Local businesses. Better value.</p>
                </div>
              </div>

              <img
                src="/brand/deal-hunter-elephant.svg"
                alt="MegaDeal deal-hunter elephant mascot"
                className="pointer-events-none absolute -bottom-10 -left-8 z-20 w-[210px] select-none drop-shadow-[0_14px_18px_rgba(38,8,87,0.24)] sm:w-[245px] lg:-bottom-14 lg:-left-14 lg:w-[285px] xl:-bottom-16 xl:-left-16 xl:w-[330px]"
              />
            </div>
          </div>
        </div>

        <svg aria-hidden="true" viewBox="0 0 1440 85" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 z-0 h-[68px] w-full text-white sm:h-[80px]">
          <path d="M0,25 C280,90 520,47 740,52 C980,58 1200,99 1440,30 L1440,85 L0,85 Z" fill="currentColor" />
        </svg>
      </section>

      <section className="relative z-30 -mt-16 px-5 sm:px-8 lg:-mt-20 lg:px-10">
        <div className={`${pageWidth} grid gap-4 lg:grid-cols-2 lg:gap-5`}>
          <div className="flex min-h-[178px] items-center gap-5 rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_16px_40px_rgba(40,7,88,0.14)] sm:p-6 lg:min-h-[188px] xl:p-7">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffe1f2] text-[#f0189a] xl:h-16 xl:w-16">
              <TicketIcon className="h-7 w-7 xl:h-8 xl:w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className={`${fredoka.className} text-[25px] font-bold leading-tight text-[#191333] xl:text-[28px]`}>Love a great deal?</h2>
              <p className="mt-1.5 max-w-[510px] text-sm leading-5 text-slate-600 sm:text-[15px] xl:text-[16px] xl:leading-6">
                Join free to get early access to local offers when MegaDeal launches in Auckland.
              </p>
              <a href="#get-notified" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#f0189a] px-6 text-sm font-extrabold text-white transition hover:bg-[#d81288] xl:px-7">
                Get launch updates →
              </a>
            </div>
          </div>

          <div className="flex min-h-[178px] items-center gap-5 rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_16px_40px_rgba(40,7,88,0.14)] sm:p-6 lg:min-h-[188px] xl:p-7">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc] xl:h-16 xl:w-16">
              <StoreIcon className="h-7 w-7 xl:h-8 xl:w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className={`${fredoka.className} text-[25px] font-bold leading-tight text-[#191333] xl:text-[28px]`}>Run a local business?</h2>
              <p className="mt-1.5 max-w-[540px] text-sm leading-5 text-slate-600 sm:text-[15px] xl:text-[16px] xl:leading-6">
                Join before launch and reach new customers, fill quieter periods and get up to 6 months advertising free with 0% commission.*
              </p>
              <Link href="/list-your-business" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#6d24dc] px-6 text-sm font-extrabold text-white transition hover:bg-[#5d1cc7] xl:px-7">
                Claim my free advertising →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5 sm:px-8 lg:px-10 lg:pt-6">
        <div className={`${pageWidth} grid overflow-hidden rounded-[18px] bg-[#f7f7fb] ring-1 ring-[#eceaf2] sm:grid-cols-2 lg:grid-cols-4`}>
          {[
            [TicketIcon, "No vouchers to buy"],
            [UsersIcon, "Deal directly with local businesses"],
            [UsersIcon, "Support businesses in your city"],
            [MapPinIcon, "Auckland first • Wellington, Christchurch, Queenstown & Hamilton next"],
          ].map(([Icon, text], index) => {
            const I = Icon as typeof TicketIcon;
            return (
              <div key={String(text)} className={`flex min-h-[86px] items-center gap-3 px-5 py-4 xl:px-6 ${index ? "border-t border-[#e4e1eb] sm:border-l sm:border-t-0" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#6d24dc] shadow-sm">
                  <I className="h-5 w-5" />
                </span>
                <p className="text-xs font-bold leading-4 text-[#292243] sm:text-sm">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
        <div className={pageWidth}>
          <div className="text-center">
            <h2 className={`${fredoka.className} text-[33px] font-bold tracking-[-0.025em] text-[#18122d] sm:text-[40px] xl:text-[44px]`}>How MegaDeal works</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 sm:text-base">Simple. Local. Great value.</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {[
              ["1", SearchIcon, "Find a deal", "Browse amazing local offers across Auckland."],
              ["2", TicketIcon, "Get the deal code", "Unlock your deal and get a unique code."],
              ["3", PhoneIcon, "Book direct & enjoy", "Use the code when booking direct with the business and enjoy."],
            ].map(([number, Icon, title, copy], index) => {
              const I = Icon as typeof SearchIcon;
              return (
                <div key={String(title)} className="relative flex items-center gap-4 rounded-[20px] bg-white p-4 sm:p-5 xl:p-6">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0189a] text-sm font-extrabold text-white">{number as string}</span>
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f4efff] text-[#6d24dc] xl:h-20 xl:w-20">
                    <I className="h-8 w-8 xl:h-9 xl:w-9" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-[#171128] xl:text-lg">{title as string}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500 xl:text-[15px]">{copy as string}</p>
                  </div>
                  {index < 2 && <span aria-hidden className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-4xl font-light text-slate-300 lg:block">›</span>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8 lg:px-10">
        <div className={pageWidth}>
          <div className="text-center">
            <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.02em] text-[#171128] sm:text-[36px] xl:text-[40px]`}>Explore deal categories</h2>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">A taste of what&apos;s coming to Auckland.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.label} className="overflow-hidden rounded-[16px] border border-[#e9e6f0] bg-white shadow-[0_6px_18px_rgba(28,18,54,0.06)]">
                  <div className="aspect-[1.48/1] overflow-hidden bg-slate-100">
                    <img src={category.image} alt={`Generic ${category.label.toLowerCase()} image`} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex min-h-[56px] items-center gap-2.5 px-3 py-3 xl:min-h-[64px] xl:px-4">
                    <Icon className="h-5 w-5 shrink-0 text-[#6d24dc]" />
                    <p className="text-xs font-extrabold leading-4 text-[#1d1733] sm:text-sm">{category.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 pb-6 sm:px-8 lg:px-10">
        <div className={`${pageWidth} grid gap-4 lg:grid-cols-2`}>
          <div className="relative overflow-hidden rounded-[22px] bg-[#fff1f8] p-6 sm:p-7 lg:min-h-[250px] lg:pl-[175px] xl:min-h-[270px] xl:pl-[205px]">
            <img src="/brand/megadeal-elephant.svg" alt="MegaDeal elephant mascot" className="absolute -bottom-8 -left-5 hidden w-[195px] lg:block xl:w-[225px]" />
            <h2 className={`${fredoka.className} text-[27px] font-bold leading-tight text-[#18122d] sm:text-[31px] xl:text-[34px]`}>Be first in line for launch deals</h2>
            <p className="mt-2 text-sm leading-5 text-slate-600 sm:text-[15px]">Get early access to the best local offers in Auckland.</p>
            <div className="mt-4">
              <EmailSignupForm audience="customer" source="coming-soon" buttonLabel="Get launch updates →" accent="brand" surface="plain" />
            </div>
            <p className="mt-2 text-xs text-slate-500">No spam. Just great deals.</p>
          </div>

          <div className="relative overflow-hidden rounded-[22px] bg-[#f4efff] p-6 sm:p-7 lg:min-h-[250px] lg:pr-[155px] xl:min-h-[270px] xl:pr-[190px]">
            <h2 className={`${fredoka.className} text-[27px] font-bold leading-tight text-[#18122d] sm:text-[31px] xl:text-[34px]`}>Fill quiet times. Grow local customers.</h2>
            <p className="mt-2 text-sm leading-5 text-slate-600">Join before launch and be part of something big in Auckland.</p>
            <ul className="mt-4 grid gap-2">
              <Tick>0% commission on every sale</Tick>
              <Tick>Up to 6 months advertising free*</Tick>
              <Tick>Customers deal directly with you</Tick>
              <Tick>A simple way to fill quieter periods</Tick>
            </ul>
            <Link href="/list-your-business" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#6d24dc] px-6 text-sm font-extrabold text-white transition hover:bg-[#5b1bc4]">
              Claim my free advertising →
            </Link>
            <img src="/brand/megadeal-elephant.svg" alt="MegaDeal elephant mascot" className="absolute -bottom-7 -right-5 hidden w-[180px] -scale-x-100 lg:block xl:w-[210px]" />
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8 lg:px-10">
        <div className={`${pageWidth} rounded-[18px] bg-[#f5f7fb] px-5 py-5 ring-1 ring-[#e8eaf0] sm:px-6`}>
          <div className="grid gap-5 lg:grid-cols-[240px_1fr] lg:items-center xl:grid-cols-[280px_1fr]">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc]">
                <MapPinIcon className="h-6 w-6" />
              </span>
              <div>
                <h2 className={`${fredoka.className} text-[22px] font-bold text-[#171128] xl:text-[24px]`}>Our launch plan</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">Auckland first, then more Kiwi cities.</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {launchCities.map(([city, status], index) => (
                <div key={city} className="relative pt-5 text-center">
                  <span className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full ${index === 0 ? "bg-[#f0189a]" : "bg-[#aab3c7]"}`} />
                  {index < launchCities.length - 1 && <span className="absolute left-[calc(50%+8px)] right-[-50%] top-[5px] h-px bg-[#cbd2e0]" />}
                  <p className={`text-xs font-extrabold sm:text-sm ${index === 0 ? "text-[#171128]" : "text-slate-500"}`}>{city}</p>
                  <p className={`mt-0.5 text-[11px] font-semibold ${index === 0 ? "text-[#171128]" : "text-slate-400"}`}>({status})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className={`${pageWidth} mt-4 text-center text-[11px] text-slate-400`}>*T&amp;Cs apply for eligible new business listings.</p>
      </section>
    </main>
  );
}
