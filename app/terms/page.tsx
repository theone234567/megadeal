import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <PageShell title="Terms of service" subtitle="Last updated August 2026">
      <p>
        These terms govern your use of MegaDeal and any deal you purchase
        through the site. By creating an order, you agree to them.
      </p>

      <h2>1. The deals we list</h2>
      <p>
        Deals are offered by third-party merchants and listed on MegaDeal
        with their agreement. MegaDeal facilitates the purchase and issues
        your voucher, but the merchant is responsible for delivering the
        underlying product or service — the meal, the treatment, the
        experience — to the standard described on the deal page.
      </p>

      <h2>2. Making a purchase</h2>
      <p>
        When you buy a deal, you&apos;re paying for a voucher redeemable with
        the listed merchant, subject to that deal&apos;s validity window and
        any conditions shown on its page (the &quot;fine print&quot;). Read
        the fine print before buying — it&apos;s part of the deal, not a
        formality.
      </p>

      <h2>3. Redemption</h2>
      <p>
        Vouchers must be redeemed within the stated validity window. Some
        deals require booking ahead with the merchant; where that&apos;s the
        case, it&apos;s noted on the deal page. See our{" "}
        <a href="/redeem" className="text-brand-600 hover:underline">
          redemption guide
        </a>{" "}
        for the general process.
      </p>

      <h2>4. Refunds and cancellations</h2>
      <p>
        See our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        for when a refund is available. In short: most unredeemed deals can
        be refunded within their validity window; redeemed and expired deals
        generally can&apos;t.
      </p>

      <h2>5. Your account and session</h2>
      <p>
        We use a lightweight session to remember your cart and order history
        across visits. You&apos;re responsible for keeping access to your
        email account secure, since that&apos;s how vouchers and order
        confirmations are delivered.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Deals are for personal use. Reselling vouchers, or attempting to
        redeem a deal outside its validity window or stated conditions, may
        result in the voucher being voided.
      </p>

      <h2>7. Liability</h2>
      <p>
        MegaDeal isn&apos;t responsible for the quality of the product or
        service a merchant provides, but we&apos;ll help mediate any dispute
        in good faith — contact us and we&apos;ll do what we can.
      </p>

      <h2>8. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        site after a change means you accept the updated terms. Material
        changes will be reflected here with an updated date.
      </p>

      <h2>9. Contact</h2>
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
