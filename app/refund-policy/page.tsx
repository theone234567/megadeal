import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <PageShell title="Refund policy" subtitle="Last updated August 2026">
      <p>
        We want every deal you buy to be one you&apos;re happy with. If
        something&apos;s not right, here&apos;s exactly how refunds work.
      </p>

      <h2>Before redemption</h2>
      <p>
        Unredeemed deals can generally be refunded within the deal&apos;s
        validity window. Contact us with your order reference and we&apos;ll
        process it — most refunds are handled within a few business days and
        returned to your original payment method.
      </p>

      <h2>After redemption</h2>
      <p>
        Once a deal has been redeemed with the merchant, it&apos;s no longer
        eligible for a refund through MegaDeal, since the merchant has
        already delivered the product or service. If something went wrong
        during redemption — the experience didn&apos;t match what was
        described, for example — let us know and we&apos;ll help mediate
        with the merchant directly.
      </p>

      <h2>Expired deals</h2>
      <p>
        Deals not redeemed before their expiry date are non-refundable, so
        keep an eye on the validity window shown on each deal page and in
        your confirmation email. If a merchant closes or is unable to honour
        a deal within its window through no fault of yours, contact us and
        we&apos;ll make it right.
      </p>

      <h2>Change of mind</h2>
      <p>
        Bought the wrong quantity, or picked a deal you&apos;ve since decided
        against? As long as it hasn&apos;t been redeemed and is still within
        its validity window, reach out and we&apos;ll process a refund.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Contact us via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        with your order reference and the reason for the request, and
        we&apos;ll take it from there.
      </p>
    </PageShell>
  );
}
