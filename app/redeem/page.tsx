import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "How to Redeem a Deal",
  description:
    "How to redeem a MegaDeal deal — no voucher or order confirmation, just contact the business directly and quote your code.",
  alternates: { canonical: `${SITE_URL}/redeem` },
};

interface Step {
  number: string;
  text: ReactNode;
}

const STEPS: Step[] = [
  { number: "1", text: <>Open the deal page and tap &quot;Get this deal&quot;</> },
  {
    number: "2",
    text: "Call, message, or visit the business using the contact details shown — some deals need a booking ahead of time, others are walk-in, so check the deal's fine print",
  },
  {
    number: "3",
    text: (
      <>
        Mention the MegaDeal offer when you get in touch or arrive —
        most deal pages show a short code (like{" "}
        <span className="font-mono font-semibold">MEGA-7K4XQ</span>)
        you can quote so the business knows straight away
      </>
    ),
  },
  { number: "4", text: "Pay the business directly at the discounted price and enjoy" },
];

export default function RedeemPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            How to redeem a deal
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            No voucher, no order confirmation — just contact the
            business directly.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-slate-600">
            MegaDeal doesn&apos;t sell vouchers or process payment for
            any deal. Every deal on the site is redeemed directly with
            the business that listed it, at the discounted price shown
            on the deal page.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
            Steps to redeem
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.number} className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                  {s.number}
                </span>
                <p className="text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking ahead + fair use */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-10">
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Booking ahead
            </h2>
            <p className="mt-3 text-slate-600">
              Some deals — like a specific spa treatment or a scheduled
              tour — need a booking in advance, especially around
              weekends and holidays. Where that&apos;s the case,
              it&apos;s noted on the deal page, so it&apos;s worth
              getting in early rather than waiting until the last few
              days of the validity window.
            </p>
          </div>
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Availability &amp; fair use
            </h2>
            <p className="mt-3 text-slate-600">
              Deals are offered directly by the business, subject to
              availability and while supplies last — where a deal has
              a quantity limit, it&apos;s first-in, first-served.
              Businesses use best endeavours to honour every deal
              within its validity window, but MegaDeal can&apos;t
              guarantee a specific deal will still be available when
              you get in touch. Deals are for genuine personal use —
              please don&apos;t resell or misuse them, and mention the
              deal honestly when you contact the business.
            </p>
          </div>
        </div>
      </section>

      {/* Trouble redeeming? */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Trouble redeeming?
          </p>
          <p className="mt-2 text-base text-slate-600">
            Can&apos;t reach the business, or they&apos;re not able to
            honour a current deal? Let us know via our{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              contact page
            </Link>{" "}
            and we&apos;ll follow up with the business on your behalf
            — but as MegaDeal is just the advertiser and never a party
            to the booking or payment, any dispute over the deal
            itself is ultimately between you and the business. See our{" "}
            <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
              terms
            </Link>{" "}
            for more.
          </p>
        </div>
      </section>
    </main>
  );
}
