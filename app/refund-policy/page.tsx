import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "MegaDeal never charges customers, so there's nothing for us to refund — here's how pricing and disputes work instead.",
  alternates: { canonical: `${SITE_URL}/refund-policy` },
};

export default function RefundPolicyPage() {
  return (
    <PageShell title="Refund policy" subtitle="Last updated August 2026">
      <p>
        MegaDeal doesn&apos;t charge customers for deals — we&apos;re an
        advertising board, not a checkout. That means there&apos;s no order,
        no card charge, and nothing for us to refund. Any payment for a deal
        happens directly between you and the business when you redeem it.
      </p>

      <h2>If a business won&apos;t honour a deal</h2>
      <p>
        If a business can&apos;t or won&apos;t honour a deal that&apos;s
        still live and within its validity window, let us know via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        . We&apos;ll follow up with the business directly and, where it&apos;s
        warranted, remove the listing.
      </p>

      <h2>Disputes over price or service</h2>
      <p>
        Since payment happens directly with the business, disputes about
        what you were charged or the quality of what you received are
        between you and them — the same as any other in-person purchase.
        We&apos;re happy to help mediate in good faith if a business isn&apos;t
        responding, but MegaDeal isn&apos;t a party to that transaction and
        can&apos;t issue a refund for it.
      </p>

      <h2>Expired deals</h2>
      <p>
        Deals shown on MegaDeal are only valid until the expiry date on the
        deal page. Once a deal expires it&apos;s removed from the site, and
        the discounted price is no longer available from the business.
      </p>

      <h2>Merchant advertising credits</h2>
      <p>
        Businesses pay MegaDeal in advertising credits or a subscription to
        list a deal — that fee is for the listing itself, separate from
        anything a customer pays the business. For billing questions, reach
        out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>
    </PageShell>
  );
}
