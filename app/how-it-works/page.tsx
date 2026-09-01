import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How MegaDeal works: browse local deals for free and contact the business directly to redeem, or list your own deal and reach new customers.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
};

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How it works"
      subtitle="MegaDeal is a free deals board, not a checkout — here's how it works."
    >
      <h2>For customers</h2>

      <h3>1. Find a deal</h3>
      <p>
        Browse by category — Food &amp; Drink, Beauty &amp; Spa, Things To
        Do, Travel &amp; Getaways, Health &amp; Fitness — or search for
        exactly what you&apos;re after. Every deal card shows the discount
        percentage, the price, and a countdown to when it ends, so you can
        tell at a glance whether it&apos;s worth a closer look.
      </p>

      <h3>2. Grab the deal</h3>
      <p>
        Open the deal page to see exactly what&apos;s on offer, the fine
        print, and who&apos;s behind it. Tap &quot;Get this deal&quot; to
        reveal the business&apos;s phone number, website and address —
        there&apos;s no voucher to buy and no checkout on MegaDeal. We
        don&apos;t take a card number or process any payment; you&apos;re
        just unlocking the business&apos;s contact details.
      </p>

      <h3>3. Redeem with the business, directly</h3>
      <p>
        Contact or visit the business, mention the MegaDeal offer, and pay
        them directly at the discounted price. How and when you redeem is up
        to the business — some deals need a booking, others are walk-in. See
        our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for the general process.
      </p>

      <h2>For businesses</h2>
      <p>
        MegaDeal is advertising, not a marketplace — you never hand us a cut
        of a sale, because we never process one. Instead, you list a deal for
        a fixed number of advertising credits, and every customer who
        redeems it pays you directly, in full.
      </p>

      <h3>1. Sign up</h3>
      <p>
        Tell us about your business on our{" "}
        <a href="/businesses" className="text-brand-600 hover:underline">
          business page
        </a>{" "}
        — no account needed just to apply.
      </p>

      <h3>2. Verify your email</h3>
      <p>
        We&apos;ll send a confirmation link to the email you signed up with —
        click it to confirm it&apos;s really you.
      </p>

      <h3>3. We review your application</h3>
      <p>
        Our team checks new businesses before they go live — usually within a
        couple of business days.
      </p>

      <h3>4. Get notified and log in</h3>
      <p>
        Once you&apos;re approved, we&apos;ll email you. Log in to your
        business portal with the same email — you&apos;ll have a couple of
        free introductory deal credits waiting, so you can submit your first
        deal straight away.
      </p>

      <h3>5. Top up anytime</h3>
      <p>
        Once your free credits run out, you can top up your account from
        your portal whenever you&apos;re ready to list another deal.
      </p>

      <h2>Questions or issues?</h2>
      <p>
        If a business can&apos;t honour a deal, or something on a listing
        looks wrong, let us know via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll follow up — we just can&apos;t issue a refund for
        something we never charged you for.
      </p>
    </PageShell>
  );
}
