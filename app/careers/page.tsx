import type { Metadata } from "next";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <PageShell
      title="Careers at MegaDeal"
      subtitle="We're a small team helping local businesses meet new customers."
    >
      <p>
        We&apos;re not currently advertising open roles, but we&apos;re always
        happy to hear from people who care about local commerce, great deals
        and building products people actually use.
      </p>
      <p>
        Send a note via our{" "}
        <a href="/contact" className="text-brand-600 hover:underline">
          contact page
        </a>{" "}
        and tell us what you&apos;d want to work on.
      </p>
    </PageShell>
  );
}
