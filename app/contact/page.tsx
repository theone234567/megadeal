import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { displayFont, plusJakartaSans } from "@/lib/fonts";
import { pageMetadata } from "@/lib/pageMetadata";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us: Help With Deals & Listings",
  description:
    "Get in touch with MegaDeal — questions about a deal, a business listing, or anything else. A real person reads every message.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Hero */}
      <PageHero crumb="Contact" title="Contact us">
        Questions about a deal, a listing, or something else — we&apos;re happy to help.
      </PageHero>

      {/* Form */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* In the page as sent: ContactForm reads ?deal= itself once
              it's on screen (see there). */}
          <ContactForm />
        </div>
      </section>

      {/* Where most questions are already answered: helpful to visitors,
          and real text and links for search and AI crawlers (the page was
          only a form). */}
      <section aria-labelledby="contact-quick-heading" className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 id="contact-quick-heading" className={`${displayFont.className} text-2xl font-bold text-slate-900`}>
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
