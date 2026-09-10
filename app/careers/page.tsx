import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "MegaDeal is a small team helping local NZ businesses reach new customers without a cut of sales — see what we look for and how to get in touch about future roles.",
  alternates: { canonical: `${SITE_URL}/careers` },
};

export default function CareersPage() {
  return (
    <main className={plusJakartaSans.className}>
      {/* Hero */}
      <section className="bg-brand-700 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h1 className={`${fredoka.className} text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl`}>
            Careers at MegaDeal
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
            We&apos;re a small team helping local businesses meet new
            customers.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-slate-600">
            MegaDeal is built around a simple idea — great local
            businesses deserve an easy way to reach new customers, and
            customers deserve an easy way to find them, without either
            side paying us a cut of every sale. Everything we build is
            in service of that.
          </p>
        </div>
      </section>

      {/* What we look for + open roles */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-10">
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              What we look for
            </h2>
            <p className="mt-3 text-slate-600">
              Wherever we do add to the team, we look for people who
              care about the small details that make a service
              trustworthy — clear pricing, honest deal descriptions, a
              site that just works — and who like working closely with
              the local businesses on the other side of every listing.
            </p>
          </div>
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              Open roles
            </h2>
            <p className="mt-3 text-slate-600">
              We&apos;re not currently advertising open roles, but
              we&apos;re always happy to hear from people who&apos;d
              be a good fit for where we&apos;re headed — whether
              that&apos;s engineering, business partnerships, or
              customer support.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${fredoka.className} text-xl font-bold text-slate-900 sm:text-2xl`}>
            Interested anyway?
          </p>
          <p className="mt-2 text-base text-slate-600">
            Send a note via our{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
              contact page
            </Link>{" "}
            and tell us what you&apos;d want to work on — we keep good
            conversations on file for when the right role opens up.
          </p>
        </div>
      </section>
    </main>
  );
}
