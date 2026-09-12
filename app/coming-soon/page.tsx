import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CheckIcon, MapPinIcon, StoreIcon, TicketIcon } from "@/components/icons";
import ComingSoonDesktopCanvas from "./ComingSoonDesktopCanvas";

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
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6d24dc] text-white">
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

      {/* Desktop is the approved visual itself, so typography, mascot, photos and spacing cannot drift. */}
      <ComingSoonDesktopCanvas />

      {/* Mobile remains real semantic HTML for usability, accessibility and mobile-first search indexing. */}
      <div className="lg:hidden">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_5%,#aa49ff_0%,#8b2df0_34%,#6719cf_100%)] px-5 pb-12 pt-8 text-white">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] ring-1 ring-white/15">
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

            <div className="relative mt-6 min-h-[255px] rounded-[26px] border-[4px] border-white/80 bg-[linear-gradient(160deg,#47b0dc_0%,#86c8e6_48%,#4e8dad_100%)] shadow-2xl">
              <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6418c9]">
                Auckland first
              </div>
              <div className="absolute inset-x-4 bottom-4 rounded-[16px] bg-[#321373]/92 px-4 py-3 text-white">
                <p className={`${fredoka.className} text-lg font-bold`}>Same city. More to discover.</p>
                <p className="mt-0.5 text-xs text-white/85">Local offers. Local businesses. Better value.</p>
              </div>
              <img
                src="/brand/megadeal-mascot-big-deals.webp"
                alt="MegaDeal deal-hunter elephant mascot holding a magnifying glass"
                width={300}
                height={300}
                className="absolute -bottom-7 -left-4 w-[175px] drop-shadow-xl"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="px-5 py-6">
          <div className="mx-auto grid max-w-xl gap-4">
            <article className="rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_12px_32px_rgba(40,7,88,.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe1f2] text-[#f0189a]"><TicketIcon className="h-6 w-6" /></span>
              <h2 className={`${fredoka.className} mt-3 text-2xl font-bold`}>Love a great deal?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Join free to get early access to local offers when MegaDeal launches in Auckland.</p>
              <a href="#mobile-updates" className="mt-4 inline-flex rounded-full bg-[#f0189a] px-5 py-3 text-sm font-extrabold text-white">Get launch updates →</a>
            </article>

            <article className="rounded-[22px] border border-[#eee7f6] bg-white p-5 shadow-[0_12px_32px_rgba(40,7,88,.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc]"><StoreIcon className="h-6 w-6" /></span>
              <h2 className={`${fredoka.className} mt-3 text-2xl font-bold`}>Run a local business?</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Join before launch, reach new customers, fill quieter periods and get up to 6 months advertising free with 0% commission.*</p>
              <Link href="/list-your-business" className="mt-4 inline-flex rounded-full bg-[#6d24dc] px-5 py-3 text-sm font-extrabold text-white">Claim my free advertising →</Link>
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0189a] text-sm font-extrabold text-white">{number}</span>
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
            <Link href="/list-your-business" className="mt-5 inline-flex rounded-full bg-[#6d24dc] px-5 py-3 text-sm font-extrabold text-white">Claim my free advertising →</Link>
          </div>
        </section>

        <section className="px-5 pb-10 pt-2">
          <div className="mx-auto flex max-w-xl items-start gap-3 rounded-[20px] bg-[#f5f7fb] p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc]"><MapPinIcon className="h-5 w-5" /></span>
            <div>
              <h2 className={`${fredoka.className} text-xl font-bold`}>Our launch plan</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Auckland first, followed by Wellington, Christchurch, Queenstown and Hamilton.</p>
              <p className="mt-3 text-[11px] text-slate-400">*T&amp;Cs apply for eligible new business listings.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Accessible equivalent of the desktop artwork. This is intentionally concise and matches what is visibly drawn. */}
      <div className="sr-only lg:block">
        <h1>Big local deals are on the way, Auckland.</h1>
        <p>MegaDeal is launching in Auckland first, helping local businesses fill quiet times and helping deal hunters discover standout local offers.</p>
        <p>Businesses can join with 0% commission and up to 6 months advertising free, subject to terms and conditions.</p>
        <h2>How MegaDeal works</h2>
        <p>Find a deal, get the deal code, then book directly with the local business and enjoy.</p>
        <h2>Launch plan</h2>
        <p>Auckland first, followed by Wellington, Christchurch, Queenstown and Hamilton.</p>
      </div>
    </main>
  );
}
