import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" subtitle="Last updated August 2026">
      <p>
        This policy explains what personal information MegaDeal collects,
        why we collect it, and the choices you have about it. By using
        MegaDeal, you agree to the practices described here. MegaDeal
        doesn&apos;t process customer payments, so we never see or store
        card or payment details — there simply aren&apos;t any to collect.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Usage data</strong> — pages viewed, deals browsed, and
          general device/browser information, used to keep the site working
          well and to improve which deals we feature.
        </li>
        <li>
          <strong>Merchant account details</strong> — if you sign in to
          list or manage a deal, we collect your business name, contact
          details, address, and photos, so we can review and display your
          listing.
        </li>
        <li>
          <strong>Communications</strong> — anything you send us through the{" "}
          <a href="/contact" className="text-brand-600 hover:underline">
            contact form
          </a>{" "}
          or by email.
        </li>
        <li>
          <strong>Deal-alert email signups</strong> — if you sign up for
          deal emails, we collect your email address. We send a
          confirmation email to verify it&apos;s really yours before adding
          you to the list, and every email includes an unsubscribe link
          that removes you immediately.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>Show relevant deals and keep the site working well</li>
        <li>Review and publish merchant listings</li>
        <li>Provide customer support and respond to enquiries</li>
        <li>Detect and prevent fraud, and keep the site secure</li>
        <li>Understand which deals and categories perform well, in aggregate</li>
      </ul>
      <p>We don&apos;t sell your personal data to third parties.</p>

      <h2>What businesses see</h2>
      <p>
        A business&apos;s name, logo, address, phone number and website are
        shown publicly on their deal listings so customers can contact them
        — that information is meant to be public. Their account email,
        used to sign in to the business portal, is never shown publicly.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small amount of cookie-based storage to keep a merchant
        signed in to the portal across visits. This is functional, not
        advertising-driven.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep merchant account and listing records for as long as needed
        to operate the site and meet legal requirements, and delete or
        anonymise other personal data when it&apos;s no longer needed for
        the purposes above.
      </p>

      <h2>Your choices</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>Unsubscribe from marketing emails using the link in any email</li>
        <li>Request a copy of the personal data we hold about you</li>
        <li>Ask us to correct or delete your personal data</li>
      </ul>
      <p>
        To exercise any of these, reach out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes to how we handle your data, we&apos;ll
        update this page and, where appropriate, let you know directly.
      </p>
    </PageShell>
  );
}
