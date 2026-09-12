import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CheckIcon, MapPinIcon, StoreIcon, TicketIcon } from "@/components/icons";
import ComingSoonDesktopCanvas from "./ComingSoonDesktopCanvas";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";

const TITLE = "MegaDeal Auckland — Big Local Deals Are On The Way";
const DESCRIPTION =
  "MegaDeal is launching in Auckland first. Deal hunters can join for launch updates, while eligible local businesses can claim up to 6 months free advertising with 0% commission.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_NZ",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-[#292243]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#650fc7] text-white">
        <CheckIcon className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function ComingSoonPage() {
  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-[#171128]`}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/coming-soon`,
            inLanguage: "en-NZ",
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
            about: [
              { "@type": "Place", name: "Auckland, New Zealand" },
              { "@type": "Thing", name: "Local deals" },
              { "@type": "Thing", name: "Local business advertising" },
            ],
          }),
        }}
      />

      <ComingSoonDesktopCanvas />

      <div className="lg:hidden">
        <section className="relative overflow-hidden bg-[#650fc7] px-5 pb-11 pt-8 text-white">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex rounded-full bg-[#e81ea3] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white shadow-sm">
              Launching first in Auckland
            </div>
            <h1 className={`${fredoka.className} mt-4 text-[43px] font-bold leading-[0.94] tracking-[-0.04em] sm:text-[52px]`}>
              Big local deals are on the way, Auckland.
            </h1>
            <p className="mt-4 text-[15px] leading-6 text-white/95">
              MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet times and helping deal hunters discover standout local offers.
            </p>
            <p className="mt-4 text-sm font-extrabold leading-6">
              0% commission for businesses<br />Up to 6 months advertising free*
            </p>

            <div className="relative mt-7 pb-5 pr-2">
              <div className="relative rotate-[1.5deg]">
                <div
                  className="relative aspect-[1.22/1] overflow-hidden border-[4px] border-white/80 shadow-2xl"
                  style={{ clipPath: "polygon(7% 0, 100% 0, 94% 100%, 0 100%)", borderRadius: "28px" }}
                >
                  <AucklandSkylineArt
                    shape="fill"
                    className="h-full w-full -rotate-[1.5deg] scale-[1.08] object-cover"
                  />
                  <div className="absolute right-3 top-3 -rotate-[1.5deg] rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#650fc7]">
                    Auckland first
                  </div>
                  <div className="absolute bottom-3 left-4 -rotate-[1.5deg] max-w-[70%] rounded-[14px] bg-[#321373]/92 px-4 py-3 text-white">
                    <p className={`${fredoka.className} text-base font-bold`}>Same city. More to discover.</p>
                    <p className="mt-0.5 text-[11px] text-white/85">Local offers. Local businesses. Better value.</p>
                  </div>
                </div>
              </div>
              <img
                src="/brand/deal-hunter-elephant.svg"
                alt="MegaDeal deal-hunter elephant holding a magnifying glass and a big deals tag"
                width={360}
                height={280}
                className="pointer-events-none absolute -bottom-5 -right-8 z-20 w-[155px] drop-shadow-xl sm:w-[185px]"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-6">
          <div className="mx-auto grid max-w-xl gap-4">
            <article className="rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_12px_32px_rgba(40,7,88,.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe1f2] text-[#e81ea3]"><TicketIcon className="h-6 w-6" /></span>
              <h2 className={`${fredoka.className} mt-3 text-2xl font-bold`}>Love a great deal?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Join free to get early access to local offers when MegaDeal launches in Auckland.</p>
              <a href="#mobile-updates" className="mt-4 inline-flex rounded-full bg-[#e81ea3] px-5 py-3 text-sm font-extrabold text-white">Get launch updates →</a>
            </article>

            <article className="rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_12px_32px_rgba(40,7,88,.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee2ff] text-[#650fc7]"><StoreIcon className="h-6 w-6" /></span>
              <h2 className={`${fredoka.className} mt-3 text-2xl font-bold`}>Run a local business?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Join before launch, reach new customers, fill quieter periods and get up to 6 months advertising free with 0% commission.*</p>
              <Link href="/list-your-business" className="mt-4 inline-flex rounded-full bg-[#650fc7] px-5 py-3 text-sm font-extrabold text-white">Claim my free advertising →</Link>
            </article>
          </div>
        </section>

        <section className="px-5 py-7">
          <div className="mx-auto max-w-xl">
            <h2 className={`${fredoka.className} text-center text-3xl font-bold`}>How MegaDeal works</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Simple. Local. Great value.</p>
            <div className="mt-5 grid gap-3">
              {[
                ["1", "Find a deal", "Browse standout local offers across Auckland."],
                ["2", "Get the deal code", "Unlock your deal and get a unique code."],
                ["3", "Book direct & enjoy", "Use the code when booking directly with the business."],
              ].map(([number, title, copy]) => (
                <div key={number} className="flex gap-3 rounded-[18px] bg-[#f8f6fc] p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e81ea3] text-sm font-extrabold text-white">{number}</span>
                  <div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="mobile-updates" className="scroll-mt-20 px-5 pb-5">
          <div className="mx-auto max-w-xl rounded-[24px] bg-[#fff1f8] p-5 sm:p-6">
            <h2 className={`${fredoka.className} text-2xl font-bold`}>Be first in line for launch deals</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Get early access to the best local offers in Auckland.</p>
            <div className="mt-4">
              <EmailSignupForm audience="customer" source="coming-soon-mobile" buttonLabel="Get launch updates →" accent="ember" surface="plain" layout="stacked" />
            </div>
          </div>
        </section>

        <section className="px-5 pb-5">
          <div className="mx-auto max-w-xl rounded-[24px] bg-[#f4efff] p-5 sm:p-6">
            <h2 className={`${fredoka.className} text-2xl font-bold`}>Fill quiet times. Grow local customers.</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Put unused appointment slots and quieter periods to work before and after launch.</p>
            <ul className="mt-4 grid gap-2">
              <Tick>0% commission on every sale</Tick>
              <Tick>Up to 6 months advertising free*</Tick>
              <Tick>Customers deal directly with you</Tick>
              <Tick>A simple way to fill quieter periods</Tick>
            </ul>
            <Link href="/list-your-business" className="mt-5 inline-flex rounded-full bg-[#650fc7] px-5 py-3 text-sm font-extrabold text-white">Claim my free advertising →</Link>
          </div>
        </section>

        <section className="px-5 pb-10 pt-2">
          <div className="mx-auto max-w-xl rounded-[20px] bg-[#f5f7fb] p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#650fc7]"><MapPinIcon className="h-5 w-5" /></span>
              <div>
                <h2 className={`${fredoka.className} text-xl font-bold`}>Our launch plan</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Auckland first, then more Kiwi cities.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-[#e81ea3] px-3 py-1.5 text-white">Auckland • first</span>
              <span className="rounded-full bg-white px-3 py-1.5">Wellington</span>
              <span className="rounded-full bg-white px-3 py-1.5">Christchurch</span>
              <span className="rounded-full bg-white px-3 py-1.5">Queenstown</span>
              <span className="rounded-full bg-white px-3 py-1.5">Hamilton</span>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">*T&amp;Cs apply for eligible new business listings.</p>
          </div>
        </section>
      </div>
    </main>
  );
}