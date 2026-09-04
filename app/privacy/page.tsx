import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL, LEGAL_ENTITY_NAME, LEGAL_ENTITY_NZBN } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" subtitle="Last updated September 2026">
      <p>
        MegaDeal is operated by {LEGAL_ENTITY_NAME} (NZBN {LEGAL_ENTITY_NZBN}),
        a company registered in New Zealand (&quot;MegaDeal&quot;,
        &quot;we&quot;, &quot;us&quot;). This policy explains what personal
        information we collect, why we collect it, and the choices you have
        about it, in line with the Privacy Act 2020. By using MegaDeal, you
        agree to the practices described here. MegaDeal doesn&apos;t process
        customer payments, so we never see or store card or payment details
        — there simply aren&apos;t any to collect.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Usage data</strong> — pages viewed, deals browsed, and
          general device/browser information, used to keep the site working
          well and to improve which deals we feature.
        </li>
        <li>
          <strong>Account and merchant details</strong> — if you sign up to
          list or manage a deal, we collect your email address and a
          password (stored securely by our identity provider, never in
          plain text), plus your business name, contact details, address,
          and photos, so we can review and display your listing.
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

      <h2>Service providers and overseas disclosure</h2>
      <p>
        We use a small number of specialist providers to run the site, and
        some personal information is processed by them on our behalf. This
        includes our headless commerce and member-login provider (Wix.com),
        our transactional email provider (Resend), Google&apos;s Places API
        for business-address autocomplete, and Meta (Facebook/Instagram)
        for ad measurement — see &quot;Cookies and advertising&quot; below.
        Some of these providers store or process data on servers outside
        New Zealand. Where that happens, we only share the information
        needed for them to provide their service to us, and we choose
        providers who apply security and privacy standards comparable to
        those required under the Privacy Act 2020.
      </p>

      <h2>How we protect your information</h2>
      <p>
        We use reasonable technical and organisational measures to protect
        personal information from loss, misuse or unauthorised access —
        including encrypted transmission (HTTPS), access controls on our
        internal tools, and restricting merchant data access to the
        merchant&apos;s own listings. No online service can guarantee
        perfect security, but if we ever became aware of a privacy breach
        likely to cause serious harm, we&apos;d notify the Office of the
        Privacy Commissioner and affected individuals as required by law.
      </p>

      <h2>Cookies and advertising</h2>
      <p>
        We use a small amount of cookie-based storage to keep a merchant
        signed in to the portal across visits — that part is functional,
        not advertising-driven.
      </p>
      <p>
        When we&apos;re running ad campaigns, pages on this site may also
        load the Meta (Facebook/Instagram) Pixel, which lets us measure
        whether an ad led to a signup and show ads to people likely to be
        interested. It can set cookies and share information such as pages
        you viewed and whether you signed up with Meta. You can control
        this through your{" "}
        <a
          href="https://www.facebook.com/adpreferences"
          className="text-brand-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook ad preferences
        </a>
        , and standard browser tracking-protection or ad-blocking tools
        will generally block it.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep merchant account and listing records for as long as needed
        to operate the site and meet legal requirements, and delete or
        anonymise other personal data when it&apos;s no longer needed for
        the purposes above.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Privacy Act 2020 you can, at any time:
      </p>
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
        . We&apos;ll normally respond within 20 working days, as required by
        the Privacy Act. If you&apos;re not satisfied with how we&apos;ve
        handled a privacy request or complaint, you can contact the Office
        of the Privacy Commissioner at{" "}
        <a
          href="https://www.privacy.org.nz"
          className="text-brand-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          privacy.org.nz
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
