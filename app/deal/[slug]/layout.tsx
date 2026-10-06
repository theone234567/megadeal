import { notFound, permanentRedirect } from "next/navigation";
import { pageLookup } from "@/lib/fetchDealServer";

/**
 * Sends an old deal address to its current one with a permanent (308)
 * redirect, so links and search standing carry over
 * (lib/db/publicReads.ts resolveDealRedirect), and answers an unknown one
 * with a real 404. Done here, not in the page: the page streams behind
 * loading.tsx, and from inside a stream a redirect can only be a refresh
 * (which search engines don't treat as a move) and a "not found" goes out
 * with status 200.
 */
export default async function Layout(props: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const { redirect, missing } = await pageLookup("deal", slug);
  if (redirect) permanentRedirect(`/deal/${redirect}`);
  if (missing) notFound();
  return props.children;
}
