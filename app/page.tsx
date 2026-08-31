import { Suspense } from "react";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import FlashDeals from "@/components/FlashDeals";
import SocialCTA from "@/components/SocialCTA";
import HomeDeals from "./HomeDeals";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const isSearching = Boolean(searchParams.q?.trim());
  const deals = await fetchAllLiveDealsServer();

  return (
    <main>
      {!isSearching && <Hero />}
      {!isSearching && <FlashDeals initialDeals={deals} />}
      <CategoryNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeDeals initialDeals={deals} />
        </Suspense>
      </div>
      <SocialCTA />
    </main>
  );
}
