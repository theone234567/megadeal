import { notFound, permanentRedirect } from "next/navigation";
import { fetchBusinessProfileBySlug, fetchDealForSEO, fetchEndedDeal, pageLookup } from "@/lib/fetchDealServer";
import { endedDealRedirect } from "@/lib/endedDealRedirect";

/**
 * Sends an old deal address to its current one with a permanent (308)
 * redirect, so links and search standing carry over
 * (lib/db/publicReads.ts resolveDealRedirect), and answers an unknown one
 * with a real 404. Done here, not in the page: the page streams its parts (the deal's
 * "more deals", photos), and from inside a stream a redirect can only be a
 * refresh (which search engines don't treat as a move) and a "not found"
 * goes out with status 200. (The route's loading skeleton is gone, T230,
 * so the deal itself is in the first HTML.) The same goes for a deal that
 * ended over 30 days ago, which moves on to its business's page
 * (lib/endedDealRedirect.ts).
 */
export default async function Layout(props: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const { redirect, missing } = await pageLookup("deal", slug);
  if (redirect) permanentRedirect(`/deal/${redirect}`);
  if (missing) notFound();
  // Both reads are cache()d: the page below uses the same ones.
  const ended = (await fetchDealForSEO(slug)) ? null : await fetchEndedDeal(slug);
  if (ended && endedDealRedirect(ended, true)) {
    // The business is looked up only for a deal that's due to move on.
    const listed = ended.businessSlug ? Boolean(await fetchBusinessProfileBySlug(ended.businessSlug).catch(() => null)) : false;
    const target = endedDealRedirect(ended, listed);
    if (target) permanentRedirect(target);
  }
  return props.children;
}
