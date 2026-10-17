import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exampleDeal } from "@/lib/demoDeals";
import DealDetail from "@/app/deal/[slug]/DealDetail";

/**
 * An example deal page (lib/demoDeals.ts), opened from the prelaunch
 * homepage's example deals: the real deal page, as a preview (nothing is
 * tracked, no link goes anywhere), under an "Example only" banner. Never
 * indexed, not in the sitemap, and no offer data, so search engines never
 * take an example for a real deal.
 */
// Rendered on request: pages prebuilt at build time from a dynamic route
// weren't served on Cloudflare (every example answered "not found"). The
// data is fixed in code, so this costs next to nothing.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const deal = exampleDeal((await props.params).slug);
  return {
    title: deal ? `Example: ${deal.name}` : "Example deal",
    description: "An example of a MegaDeal deal page. Not a live offer.",
    robots: { index: false, follow: true },
  };
}

export default async function ExampleDealPage(props: { params: Promise<{ slug: string }> }) {
  const deal = exampleDeal((await props.params).slug);
  if (!deal) notFound();
  return <DealDetail deal={deal} example />;
}
