import { Suspense } from "react";
import type { Metadata } from "next";
import CategoryNav from "@/components/CategoryNav";
import FlashDealsList from "./FlashDealsList";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: `Flash Deals — Short-Burst Offers | ${SITE_NAME}`,
  description: `All of ${SITE_NAME}'s current flash deals in one place — short-burst offers that end fast, so grab them while they last.`,
  alternates: { canonical: `${SITE_URL}/flash-deals` },
  openGraph: {
    title: `Flash Deals | ${SITE_NAME}`,
    description: "Short-burst offers that end fast — grab them while they last.",
    url: `${SITE_URL}/flash-deals`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary", title: `Flash Deals | ${SITE_NAME}` },
};

export default function FlashDealsPage() {
  return (
    <main>
      <CategoryNav />
      <div className="bg-brand-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
            ⚡ Flash Deals
          </h1>
          <p className="mt-1 text-sm text-brand-100">
            Short-burst offers that end fast — grab them while they last.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <FlashDealsList />
        </Suspense>
      </div>
    </main>
  );
}
