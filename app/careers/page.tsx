import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "MegaDeal is a small team helping local NZ businesses reach new customers without a cut of sales — see what we look for and how to get in touch about future roles.",
  alternates: { canonical: `${SITE_URL}/careers` },
};

export default function CareersPage() {
  return (
    <PageShell
      title="Careers at MegaDeal"
      subtitle="We're a small team helping local businesses meet new customers."
    >
      <p>
        MegaDeal is built around a simple idea — great local businesses
        deserve an easy way to reach new customers, and customers deserve an
        easy way to find them, without either side paying us a cut of every
        sale. Everything we build is in service of that.
      </p>

      <h2>What we look for</h2>
      <p>
        Wherever we do add to the team, we look for people who care about
        the small details that make a service trustworthy — clear pricing,
        honest deal descriptions, a site that just works — and who like
        working closely with the local businesses on the other side of every
        listing.
      </p>

      <h2>Open roles</h2>
      <p>
        We&apos;re not currently advertising open roles, but we&apos;re
        always happy to hear from people who&apos;d be a good fit for where
        we&apos;re headed — whether that&apos;s engineering, merchant
        partnerships, or customer support.
      </p>

      <p>
        Send a note via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and tell us what you&apos;d want to work on — we keep good
        conversations on file for when the right role opens up.
      </p>
    </PageShell>
  );
}
