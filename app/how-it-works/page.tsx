import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "How It Works" };

export default function HowItWorksPage() {
  return (
    <PageShell title="How it works">
      <h2>1. Find a deal</h2>
      <p>
        Browse by category or search for what you&apos;re after — dinner,
        a massage, an activity, a weekend away. Every deal shows the discount,
        the fine print and how long it&apos;s available.
      </p>
      <h2>2. Buy it now, use it later</h2>
      <p>
        Add a deal to your cart and check out securely. There&apos;s no
        subscription and no recurring charge — you pay once for the deal you
        picked.
      </p>
      <h2>3. Redeem with the merchant</h2>
      <p>
        Your order confirmation is your voucher. Contact or visit the
        merchant to book a time, and redeem it whenever suits you within the
        deal&apos;s validity window.
      </p>
    </PageShell>
  );
}
