import { notFound, permanentRedirect } from "next/navigation";
import { fetchBusinessIndexFacts, fetchBusinessProfileBySlug, pageLookup } from "@/lib/fetchDealServer";

/**
 * Sends an old business address (from before a rename, or the Wix-era
 * <name>-<id> form) to its current one with a permanent (308) redirect, so
 * links and search standing carry over (lib/db/publicReads.ts
 * resolveBusinessRedirect), and answers an unknown one with a real 404.
 * Done here, not in the page: parts of the page stream in, and from
 * inside a stream a redirect can only be a
 * refresh (which search engines don't treat as a move) and a "not found"
 * goes out with status 200. (The route's loading skeleton is gone, T230,
 * so the business itself is in the first HTML.)
 */
export default async function Layout(props: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const { redirect, missing } = await pageLookup("business", slug);
  if (redirect) permanentRedirect(`/business/${redirect}`);
  if (missing) notFound();
  // Read here too what the page's title and description need (both reads
  // are cache()d, so the page doesn't read twice): with them still
  // pending when the page starts, the title and description were sent
  // far down the page instead of in <head>, to Google and AI crawlers too
  // (only Bing got them in place), as on the deal page they aren't.
  const found = await fetchBusinessProfileBySlug(slug).catch(() => null);
  if (found) await fetchBusinessIndexFacts(found.business.id);
  return props.children;
}
