import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { SITE_URL } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with MegaDeal — questions about a deal, a business listing, or anything else. A real person reads every message.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

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
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
