import type { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { plusJakartaSans } from "@/lib/fonts";
import ComingSoonHero from "@/components/comingSoon/ComingSoonHero";
import AudienceChoiceCards from "@/components/comingSoon/AudienceChoiceCards";
import BenefitsRow from "@/components/comingSoon/BenefitsRow";
import HowItWorks from "@/components/comingSoon/HowItWorks";
import DealCategories from "@/components/comingSoon/DealCategories";
import LaunchSignup from "@/components/comingSoon/LaunchSignup";
import BusinessLaunchOffer from "@/components/comingSoon/BusinessLaunchOffer";
import LaunchRoadmap from "@/components/comingSoon/LaunchRoadmap";

const TITLE = "MegaDeal is Coming Soon — NZ Local Deals & Free Advertising";
const DESCRIPTION =
  "MegaDeal is a Kiwi-owned deals platform launching soon in NZ. Save up to 50% direct from local businesses — advertise commission-free and keep every dollar.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ComingSoonPage() {
  return (
    <main className={`min-h-screen bg-white pb-16 ${plusJakartaSans.className}`}>
      <ComingSoonHero />
      <AudienceChoiceCards />
      <BenefitsRow />
      <HowItWorks />
      <DealCategories />
      <LaunchSignup />
      <BusinessLaunchOffer />
      <LaunchRoadmap />
    </main>
  );
}
