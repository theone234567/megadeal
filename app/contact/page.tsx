import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with MegaDeal — questions about a deal, a business listing, or anything else. A real person reads every message.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact us"
      subtitle="Questions about a deal, a listing, or something else — we're happy to help."
    >
      <ContactForm />
    </PageShell>
  );
}
