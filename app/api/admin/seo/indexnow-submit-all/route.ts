import { NextRequest, NextResponse } from "next/server";
import { cityPath, flashDealsPath } from "@/lib/cities";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { submitUrlsToIndexNow } from "@/lib/indexNow";
import { SITE_URL, SITE_LAUNCHED } from "@/lib/siteConfig";
import {
  fetchAllLiveDealSlugsForSitemap,
  fetchAllBusinessSlugsForSitemap,
} from "@/lib/fetchDealServer";
import { CATEGORIES, categoryPath } from "@/lib/categories";

// One-off bulk push of every currently-live URL to IndexNow — for kicking
// off indexing of pages that were already up before IndexNow submission
// existed (the per-deal push in admin/deals/[id] only covers deals that go
// live from here on). Safe to re-run any time; IndexNow submissions are
// idempotent notifications, not a one-shot claim.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    // Matches app/sitemap.ts's own unconditional (pre-launch-safe) bucket —
    // /flash-deals used to be here instead, but it's robots:{index:false}
    // until SITE_LAUNCHED, so pushing it via IndexNow just asked Bing to
    // recrawl a page it would then correctly skip indexing anyway.
    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/coming-soon`,
      `${SITE_URL}/list-your-business`,
      `${SITE_URL}/advertise/restaurants`,
      `${SITE_URL}/advertise/beauty-spa`,
      `${SITE_URL}/advertise/home-car`,
      `${SITE_URL}/advertise/things-to-do`,
      `${SITE_URL}/how-it-works`,
      `${SITE_URL}/redeem`,
      `${SITE_URL}/help`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/careers`,
      `${SITE_URL}/terms`,
      `${SITE_URL}/privacy`,
      `${SITE_URL}/refund-policy`,
    ];
    // Before launch, category, deal and business pages are admin-only
    // previews that redirect everyone else to /coming-soon (middleware.ts)
    // — same split as app/sitemap.ts, so only the public pages go out.
    let urls = staticUrls;
    if (SITE_LAUNCHED) {
      const deals = await fetchAllLiveDealSlugsForSitemap();
      const dealUrls = deals.map((d) => `${SITE_URL}/deal/${d.slug}`);
      // Same as the sitemap: only categories that have a live deal.
      const categoryUrls = CATEGORIES.filter((c) => deals.some((d) => d.categories.includes(c.name))).map(
        (c) => `${SITE_URL}${categoryPath(c.name)}`
      );
      const businesses = await fetchAllBusinessSlugsForSitemap();
      const businessUrls = businesses.map((b) => `${SITE_URL}/business/${b.slug}`);
      urls = [...staticUrls, `${SITE_URL}${cityPath()}`, `${SITE_URL}${flashDealsPath()}`, ...categoryUrls, ...dealUrls, ...businessUrls];
    }
    await submitUrlsToIndexNow(urls);

    await logAdminAction({ action: "Submitted all pages to search engines", detail: `${urls.length} URLs` });
    return NextResponse.json({ submitted: urls.length });
  } catch (err) {
    console.error("[admin/seo/indexnow-submit-all] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
