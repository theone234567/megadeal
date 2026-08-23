import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "List Your Deal" };

export default function MerchantsPage() {
  return (
    <PageShell
      title="List your deal"
      subtitle="Reach new customers in your city without any upfront ad spend."
    >
      <p>
        Restaurants, spas, activity providers and travel operators use
        MegaDeal to fill quiet periods and introduce themselves to customers
        who&apos;ve never visited before. You set the offer and the
        redemption terms — we handle the marketing, payments and customer
        support.
      </p>
      <h2>Why merchants list with us</h2>
      <ul>
        <li>No upfront cost — you only pay a share of each deal sold</li>
        <li>Full control over how many vouchers are available and when</li>
        <li>New customer data and repeat-visit insights</li>
      </ul>
      <p>
        Interested in listing your business? Reach out via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and we&apos;ll be in touch.
      </p>
    </PageShell>
  );
}
