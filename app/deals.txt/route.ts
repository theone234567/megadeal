import { CATEGORIES, categoryPath } from "@/lib/categories";
import { DEFAULT_CITY, cityPath } from "@/lib/cities";
import { fetchAllLiveDealsServer } from "@/lib/fetchDealServer";
import { SITE_LAUNCHED, SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import type { Deal } from "@/lib/types";

/**
 * Every live deal as plain text, grouped by category: for AI assistants
 * and answer engines, which read this far more reliably than a page of
 * cards (listed in /llms.txt). Rebuilt from the same live listing as the
 * pages, so it's never more than a minute behind them.
 */
// Rendered for each request, never at build time: the build can't see the
// switches in wrangler.toml [vars] (DATA_BACKEND is runtime-only) or reach
// the database, so a build-time copy would hold Wix's data, or none, until
// it was next refreshed. The deal listing it reads keeps its own one-minute
// cache (fetchAllLiveDealsServer), as the homepage does.
export const dynamic = "force-dynamic";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" }) : null;

function line(d: Deal): string {
  const where = [d.businessName, d.businessSuburb].filter(Boolean).join(", ");
  const price = d.was > d.now ? `${money(d.now)} (was ${money(d.was)}, ${d.discountPercent}% off)` : money(d.now);
  const ends = day(d.expiresAt);
  return `- ${d.name}${where ? ` at ${where}` : ""}: ${price}${d.isFlash ? ", flash deal" : ""}${ends ? `, ends ${ends}` : ""}. ${SITE_URL}/deal/${d.slug}`;
}

export async function GET() {
  // Not for search results: the deal pages are what should rank. AI
  // crawlers read it regardless; search engines just don't list it.
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=60", "X-Robots-Tag": "noindex" };
  if (!SITE_LAUNCHED) {
    return new Response(`# ${SITE_NAME} live deals\n\n${SITE_NAME} hasn't launched yet, so there are no live deals. See ${SITE_URL}/coming-soon.\n`, { headers });
  }
  const deals = await fetchAllLiveDealsServer();
  const out = [
    `# ${SITE_NAME} live deals in ${DEFAULT_CITY.name}`,
    "",
    `Updated ${new Date().toISOString()}. ${deals.length} live ${deals.length === 1 ? "deal" : "deals"}. Prices are in NZ dollars and paid to the business, not ${SITE_NAME}: customers contact the business (call, book or visit) and quote the deal code shown on the deal page. Deals change often; check the deal page before relying on a price or date.`,
    `All deals: ${SITE_URL}${cityPath()}`,
  ];
  for (const c of CATEGORIES) {
    const inCategory = deals.filter((d) => d.categories.includes(c.name));
    if (!inCategory.length) continue;
    out.push("", `## ${c.name} (${SITE_URL}${categoryPath(c.name)})`, "", ...inCategory.map(line));
  }
  return new Response(out.join("\n") + "\n", { headers });
}
