import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL, LEGAL_ENTITY_NAME, LEGAL_ENTITY_NZBN } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "MegaDeal's Terms of Service — the rules for using the site as a customer or business, including how deals, accounts and listings work.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of service" subtitle="Last updated September 2026">
      <p>
        MegaDeal is operated by {LEGAL_ENTITY_NAME} (NZBN {LEGAL_ENTITY_NZBN}),
        a company registered in New Zealand (&quot;MegaDeal&quot;,
        &quot;we&quot;, &quot;us&quot;). These terms govern your use of
        MegaDeal, whether you&apos;re browsing deals as a customer or listing
        a deal as a business. By browsing or listing a deal on the site, you
        agree to them.
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
        quantity limit, are available on a first-in, first-served basis
        while supplies last — MegaDeal doesn&apos;t guarantee that any
        specific deal will still be available when you get in touch, and
        the business will use best endeavours, but isn&apos;t obliged, to
        honour a deal once its stated supply or booking capacity is
        reached. Redeeming a deal means contacting or visiting the business
        directly and paying them at the discounted price shown — subject to
        that deal&apos;s validity window and any conditions on its page (the
        &quot;fine print&quot;). Read the fine print before you go —
        it&apos;s part of the deal, not a formality. Any activity, treatment
        or service you book through a deal is undertaken at your own risk
        and is between you and the business — see &quot;Disclaimers and
        liability&quot; below.
      </p>
      <p>
        Deals are for genuine, personal use — unless a listing says
        otherwise, that generally means one redemption per person, and not
        reselling, on-selling, or otherwise exploiting a deal beyond its
        evident intent. A business may decline to honour a deal it
        reasonably believes is being misused in this way. Any dispute about
        a booking, a redemption, or the deal itself — including whether it
        was honoured, its quality, or its fine print — is between you and
        the business; MegaDeal is the advertiser only and isn&apos;t a party
        to it.
      </p>

      <h2>3. Businesses listing deals</h2>
      <p>
        Businesses list deals on MegaDeal in exchange for advertising
        credits or a subscription fee, paid to MegaDeal for the listing
        itself. The business is solely responsible for honouring the deal
        as described, fulfilling the underlying product or service, and any
        booking or capacity limits they set. MegaDeal is not the supplier of
        any product or service advertised on the site and gives no
        guarantee in respect of it under the Consumer Guarantees Act 1993 or
        otherwise — the business is the supplier, and any statutory
        guarantees run to them.
      </p>
      <p>
        There&apos;s no minimum term — a business can pause, update or
        cancel a live listing at any time from its portal. Advertising
        credits already spent on a listing aren&apos;t refunded when it&apos;s
        paused or cancelled, and cancelling a listing doesn&apos;t relieve
        the business of honouring any redemption or booking a customer
        already made in good faith before that point.
      </p>
      <p>
        Advertising credits have no cash value and can&apos;t be sold,
        transferred or exchanged for a refund. We may correct or adjust a
        business&apos;s credit balance where it&apos;s wrong because of a
        system error, technical fault, or a mistake in applying these
        terms — for example, reversing credits granted in error, or
        crediting back an amount that was incorrectly deducted.
      </p>

      <h2>4. Accuracy of listings</h2>
      <p>
        Businesses are solely responsible for the accuracy of their own
        listings — pricing, terms, availability and any images or
        descriptions supplied — and for making sure their listing complies
        with the Fair Trading Act 1986 and any other law that applies to
        their advertising (for example, showing prices to consumers
        inclusive of GST where required). If something looks wrong, tell us
        via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>
      <p>
        We may also correct obvious errors in a business&apos;s own listing
        or profile ourselves — for example a typo, a wrongly formatted
        phone number, or a broken link — without treating it as a new
        submission requiring re-approval. This doesn&apos;t change who&apos;s
        responsible for the listing&apos;s accuracy; it&apos;s a courtesy
        fix, not a review or endorsement of the content.
      </p>

      <h2>5. Refunds and disputes</h2>
      <p>
        See our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        — in short, MegaDeal never charges customers, so there&apos;s
        nothing for us to refund. Payment and any resulting dispute over a
        deal is between the customer and the business.
      </p>

      <h2>6. Your account and eligibility</h2>
      <p>
        Signing in is only needed to manage a merchant listing through the
        portal. To create an account you must be at least 18 years old and,
        if you&apos;re signing up on behalf of a business, authorised to
        bind that business to these terms. We use a lightweight session to
        keep you signed in across visits — you&apos;re responsible for
        keeping your login details and access to your account secure, and
        for all activity that happens under it.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Deals are for personal use. Attempting to redeem a deal outside its
        validity window or stated conditions may be declined by the
        business. You agree not to misuse the site — including submitting
        false or misleading listings, scraping or copying the site&apos;s
        content at scale, attempting to access another user&apos;s account,
        or interfering with the site&apos;s normal operation.
      </p>

      <h2>8. Listing content and intellectual property</h2>
      <p>
        The MegaDeal name, logo and site design belong to us and may not be
        used without permission. When a business submits a photo, logo,
        description or other content for a listing, it grants MegaDeal a
        non-exclusive, royalty-free licence to host, display and promote
        that content on the site and in our own marketing (for example, on
        social media or in emails) for as long as the listing or account is
        active. The business warrants that it owns or has the necessary
        rights and permissions to submit that content and that it doesn&apos;t
        infringe anyone else&apos;s rights.
      </p>

      <h2>9. Referral rewards</h2>
      <p>
        From time to time we may offer businesses advertising credits or
        other rewards for referring other businesses to MegaDeal. Referral
        rewards are granted at MegaDeal&apos;s discretion, are subject to
        verification (including that the referred business genuinely signs
        up and is approved), have no cash value, and can&apos;t be sold or
        transferred. We may withhold or reverse a reward if we reasonably
        suspect fraud, abuse, or that the referral wasn&apos;t genuine.
      </p>

      <h2>10. Declining, suspending or cancelling a business or listing</h2>
      <p>
        We review new business applications and deals before they go live,
        and we may decline any application, or refuse, edit the
        presentation of, suspend, cancel or remove any listing — or
        suspend, cancel or terminate an account — at any time and at our
        discretion, including where an application or listing appears
        inaccurate, misleading, unlawful, or otherwise breaches these
        terms. Where reasonably practicable we&apos;ll let the business know
        why.
      </p>

      <h2>11. Disclaimers and liability</h2>
      <p>
        MegaDeal isn&apos;t responsible for the quality, safety, legality or
        delivery of any product or service a business advertises — that
        responsibility sits with the business, and any activity or
        treatment you undertake through a deal is at your own risk. The
        site and its content are provided &quot;as is&quot;, without
        warranty that it will be uninterrupted, error-free or always
        accurate. To the maximum extent permitted by law, MegaDeal excludes
        all liability for indirect, incidental or consequential loss
        (including lost profits or lost business) arising from your use of
        the site, and our total liability to you for any claim arising out
        of these terms or your use of the site is limited to NZD $100. This
        clause doesn&apos;t exclude or limit any guarantee, right or remedy
        that can&apos;t lawfully be excluded or limited (for example, under
        the Consumer Guarantees Act 1993, to the extent it applies to
        MegaDeal&apos;s own service of running the site).
      </p>

      <h2>12. Indemnity</h2>
      <p>
        If you&apos;re a business, you agree to indemnify and hold MegaDeal
        harmless from any claim, loss, damage or cost (including reasonable
        legal costs) arising from your listing content, your breach of
        these terms, or your failure to honour a deal as advertised.
      </p>

      <h2>13. Resolving disputes</h2>
      <p>
        If a dispute arises between you and MegaDeal, or between you and
        another user (including a business), please contact us first and
        we&apos;ll work with you in good faith to resolve it informally
        before either of us takes formal legal action.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These terms are governed by the laws of New Zealand, and you and
        MegaDeal both submit to the exclusive jurisdiction of the courts of
        New Zealand.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        site after a change means you accept the updated terms. Material
        changes will be reflected here with an updated date.
      </p>

      <h2>16. Contact</h2>
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
