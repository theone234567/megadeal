import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" subtitle="Last updated August 2026">
      <h2>What we collect</h2>
      <p>
        When you browse or buy a deal, we collect basic order and contact
        details needed to process your purchase and deliver your voucher —
        such as your name, email address and order history.
      </p>
      <h2>How we use it</h2>
      <p>
        Your information is used to fulfil orders, provide customer support,
        and — if you opt in — send you deals we think you&apos;ll like. We
        don&apos;t sell your personal data.
      </p>
      <h2>Sharing with merchants</h2>
      <p>
        When you redeem a deal, the merchant receives the details needed to
        honour your voucher, such as your name and order reference.
      </p>
      <h2>Your choices</h2>
      <p>
        You can unsubscribe from marketing emails at any time, and can
        request access to or deletion of your data via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>
        .
      </p>
    </PageShell>
  );
}
