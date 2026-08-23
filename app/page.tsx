import { Suspense } from "react";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import HomeDeals from "./HomeDeals";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <CategoryNav />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HomeDeals />
        </Suspense>
      </div>
    </main>
  );
}
