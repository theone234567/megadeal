import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { submitUrlsToIndexNow } from "@/lib/indexNow";
import { SITE_URL } from "@/lib/siteConfig";
import {
  fetchAllLiveDealSlugsForSitemap,
  fetchAllBusinessSlugsForSitemap,
} from "@/lib/fetchDealServer";
import { CATEGORIES } from "@/lib/categories";

// One-off bulk push of every currently-live URL to IndexNow — for kicking
// off indexing of pages that were already up before IndexNow submission
// existed (the per-deal push in admin/deals/[id] only covers deals that go
// live from here on). Safe to re-run any time; IndexNow submissions are
// idempotent notifications, not a one-shot claim.
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const staticUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/businesses`,
      `${SITE_URL}/how-it-works`,
      `${SITE_URL}/about`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/flash-deals`,
    ];
    const categoryUrls = CATEGORIES.map((c) => `${SITE_URL}/category/${encodeURIComponent(c.name)}`);
    const deals = await fetchAllLiveDealSlugsForSitemap();
    const dealUrls = deals.map((d) => `${SITE_URL}/deal/${d.slug}`);
    const businessSlugs = await fetchAllBusinessSlugsForSitemap();
    const businessUrls = businessSlugs.map((slug) => `${SITE_URL}/business/${slug}`);

    const urls = [...staticUrls, ...categoryUrls, ...dealUrls, ...businessUrls];
    await submitUrlsToIndexNow(urls);

    return NextResponse.json({ submitted: urls.length });
  } catch (err) {
    console.error("[admin/seo/indexnow-submit-all] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
