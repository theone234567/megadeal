import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with MegaDeal — questions about a deal, a business listing, or anything else. A real person reads every message.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            Contact us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            Questions about a deal, a listing, or something else —
            we&apos;re happy to help.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* ContactForm reads ?deal= to seed a report from a deal page,
              and useSearchParams needs a boundary or this statically
              prerendered page falls back to client-side rendering for the
              whole route. */}
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </section>

      {/* Where most questions are already answered: helpful to visitors,
          and real text and links for search and AI crawlers (the page was
          only a form). */}
      <section aria-labelledby="contact-quick-heading" className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 id="contact-quick-heading" className={`${fredoka.className} text-2xl font-bold text-slate-900`}>
            You might find your answer here
          </h2>
          <ul className="mt-5 space-y-4 text-base text-slate-600">
            <li>
              <Link href="/help" className="font-semibold text-brand-600 hover:underline">
                Help centre
              </Link>{" "}
              — common questions about deals, booking, payment and what to do if a business won&apos;t honour a deal.
            </li>
            <li>
              <Link href="/redeem" className="font-semibold text-brand-600 hover:underline">
                How to redeem a deal
              </Link>{" "}
              — get the deal code, contact the business and pay them directly.
            </li>
            <li>
              <Link href="/list-your-business" className="font-semibold text-brand-600 hover:underline">
                Advertise your business
              </Link>{" "}
              — how Auckland businesses join MegaDeal, with 0% commission on sales.
            </li>
            <li>
              <Link href="/refund-policy" className="font-semibold text-brand-600 hover:underline">
                Refund policy
              </Link>{" "}
              — MegaDeal never charges customers, so payment is always between you and the business.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
