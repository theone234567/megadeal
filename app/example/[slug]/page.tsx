import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exampleDeal } from "@/lib/demoDeals";
import { fetchTestBusinessDeals } from "@/lib/fetchDealServer";
import { hideEmail } from "@/lib/hiddenEmail";
import { isAdminViewer } from "@/lib/adminViewer";
import type { Deal } from "@/lib/types";
import DealDetail from "@/app/deal/[slug]/DealDetail";

/**
 * An example deal page (lib/demoDeals.ts, or a test business's live deal:
 * lib/fetchDealServer.ts fetchTestBusinessDeals), opened from the prelaunch
 * homepage's example deals: the real deal page, as a preview (nothing is
 * tracked, no link goes anywhere), under an "Example only" banner. Never
 * indexed, not in the sitemap, and no offer data, so search engines never
 * take an example for a real deal.
 */
// Rendered on request: pages prebuilt at build time from a dynamic route
// weren't served on Cloudflare (every example answered "not found"). The
// data is fixed in code, so this costs next to nothing.
export const dynamic = "force-dynamic";

/** A fixed example, or else (for a signed-in admin only) a test
 *  business's live deal with that address. */
async function findExample(slug: string): Promise<Deal | null> {
  const fixed = exampleDeal(slug);
  if (fixed) return fixed;
  if (!(await isAdminViewer())) return null;
  return (await fetchTestBusinessDeals()).find((d) => d.slug === slug) ?? null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const deal = await findExample((await props.params).slug);
  return {
    title: deal ? `Example: ${deal.name}` : "Example deal",
    description: "An example of a MegaDeal deal page. Not a live offer.",
    robots: { index: false, follow: true },
  };
}

export default async function ExampleDealPage(props: { params: Promise<{ slug: string }> }) {
  const deal = await findExample((await props.params).slug);
  if (!deal) notFound();
  // As on the deal page: emails reach the browser encoded (lib/hiddenEmail.ts).
  return (
    <DealDetail
      deal={{
        ...deal,
        businessBookingEmail: hideEmail(deal.businessBookingEmail),
        ...(deal.contactOverride?.email ? { contactOverride: { ...deal.contactOverride, email: hideEmail(deal.contactOverride.email) } } : {}),
      }}
      example
    />
  );
}
