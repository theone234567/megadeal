import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <PageShell title="Terms of service" subtitle="Last updated August 2026">
      <h2>1. The deals we list</h2>
      <p>
        Deals are offered by third-party merchants. MegaDeal facilitates the
        purchase and provides the voucher, but the merchant is responsible
        for delivering the underlying product or service.
      </p>
      <h2>2. Purchases</h2>
      <p>
        When you buy a deal, you&apos;re paying for a voucher redeemable with
        the listed merchant, subject to that deal&apos;s validity window and
        any conditions shown on its page.
      </p>
      <h2>3. Refunds</h2>
      <p>
        See our{" "}
        <a href="/refund-policy" className="text-brand-600 hover:underline">
          refund policy
        </a>{" "}
        for details on when a refund is available.
      </p>
      <h2>4. Changes</h2>
      <p>
        We may update these terms from time to time; continued use of the
        site after a change means you accept the updated terms.
      </p>
    </PageShell>
  );
}
