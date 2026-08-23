import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" subtitle="Last updated August 2026">
      <p>
        This policy explains what personal information MegaDeal collects,
        why we collect it, and the choices you have about it. By using
        MegaDeal, you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <p>When you browse or buy a deal, we may collect:</p>
      <ul>
        <li>
          <strong>Account and order details</strong> — your name, email
          address, and order history, so we can process purchases and send
          your voucher.
        </li>
        <li>
          <strong>Payment information</strong> — handled and stored by our
          payment processor, not by MegaDeal directly. We never see or store
          full card numbers.
        </li>
        <li>
          <strong>Usage data</strong> — pages viewed, deals browsed, and
          general device/browser information, used to keep the site working
          well and to improve which deals we feature.
        </li>
        <li>
          <strong>Communications</strong> — anything you send us through the{" "}
          <a href="/contact" className="text-brand-600 hover:underline">
            contact form
          </a>{" "}
          or by email.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Process orders and deliver your voucher</li>
        <li>Provide customer support and respond to enquiries</li>
        <li>Send deal recommendations and updates, if you&apos;ve opted in</li>
        <li>Detect and prevent fraud, and keep the site secure</li>
        <li>Understand which deals and categories perform well, in aggregate</li>
      </ul>
      <p>We don&apos;t sell your personal data to third parties.</p>

      <h2>Sharing with merchants</h2>
      <p>
        When you buy a deal, the merchant behind it receives what they need
        to honour your voucher — typically your name and order reference.
        They don&apos;t receive your payment details.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small amount of cookie-based storage to keep your cart and
        visitor session working across page loads. This is functional, not
        advertising-driven — see our{" "}
        <a href="/terms" className="text-brand-600 hover:underline">
          terms of service
        </a>{" "}
        for how sessions work.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep order records for as long as needed for accounting, dispute
        resolution and legal requirements, and delete or anonymise other
        personal data when it&apos;s no longer needed for the purposes above.
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
