import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPolicyPage() {
  return (
    <PageShell title="Refund policy">
      <p>
        We want every deal you buy to be one you&apos;re happy with. If
        something&apos;s not right, here&apos;s how refunds work.
      </p>
      <h2>Before redemption</h2>
      <p>
        Unredeemed deals can generally be refunded within the deal&apos;s
        validity window. Contact us with your order details and we&apos;ll
        process it.
      </p>
      <h2>After redemption</h2>
      <p>
        Once a deal has been redeemed with the merchant, it&apos;s no longer
        eligible for a refund through MegaDeal — any service issues should be
        raised with the merchant directly, and we&apos;re happy to help
        mediate if needed.
      </p>
      <h2>Expired deals</h2>
      <p>
        Deals not redeemed before their expiry date are non-refundable, so
        keep an eye on the validity window shown on each deal page.
      </p>
    </PageShell>
  );
}
