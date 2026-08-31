import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of service" subtitle="Last updated August 2026">
      <p>
        These terms govern your use of MegaDeal. By browsing or listing a
        deal on the site, you agree to them.
      </p>

      <h2>1. What MegaDeal is</h2>
      <p>
        MegaDeal is an advertising directory for local deals. We list offers
        on behalf of third-party businesses, but we&apos;re not a party to
        any transaction between you and a business — we don&apos;t sell
        vouchers, don&apos;t process payment, and don&apos;t take a cut of
        anything you pay a business when you redeem a deal.
      </p>

      <h2>2. Browsing and redeeming a deal</h2>
      <p>
        Deals are shown for a limited time and, where a merchant has set a
        quantity limit, on a first-in, first-served basis. Redeeming a deal
        means contacting or visiting the business directly and paying them
        at the discounted price shown — subject to that deal&apos;s validity
        window and any conditions on its page (the &quot;fine print&quot;).
        Read the fine print before you go — it&apos;s part of the deal, not
        a formality.
      </p>

      <h2>3. Businesses listing deals</h2>
      <p>
        Businesses list deals on MegaDeal in exchange for advertising
        credits or a subscription fee, paid to MegaDeal for the listing
        itself. The business is solely responsible for honouring the deal
        as described, fulfilling the underlying product or service, and any
        booking or capacity limits they set.
      </p>

      <h2>4. Accuracy of listings</h2>
      <p>
        Businesses are responsible for the accuracy of their own listings —
        pricing, terms, and availability. If something looks wrong, tell us
        via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>

      <h2>5. Refunds and disputes</h2>
      <p>
        See our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        — in short, MegaDeal never charges you, so there&apos;s nothing for
        us to refund. Payment and any resulting dispute is between you and
        the business.
      </p>

      <h2>6. Your account</h2>
      <p>
        Signing in is only needed to manage a merchant listing through the
        portal. We use a lightweight session to keep you signed in across
        visits — you&apos;re responsible for keeping access to your account
        secure.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Deals are for personal use. Attempting to redeem a deal outside its
        validity window or stated conditions may be declined by the
        business.
      </p>

      <h2>8. Liability</h2>
      <p>
        MegaDeal isn&apos;t responsible for the quality of the product or
        service a business provides, but we&apos;ll help mediate any
        dispute in good faith — contact us and we&apos;ll do what we can.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        site after a change means you accept the updated terms. Material
        changes will be reflected here with an updated date.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms? Reach us via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>
    </PageShell>
  );
}
