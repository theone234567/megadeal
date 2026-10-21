import { NextRequest, NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { submitUrlsToIndexNow } from "@/lib/indexNow";

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
    // Exactly the sitemap's pages (app/sitemap.ts): the public pages, and
    // the city, category, flash, deal and business pages only when they're
    // indexable. A hand-kept copy of the list here had drifted from it,
    // sending /coming-soon (a redirect since the prelaunch homepage) and
    // empty, noindexed listings, and leaving out /developers.
    const urls = (await sitemap()).map((entry) => entry.url);
    await submitUrlsToIndexNow(urls);

    await logAdminAction({ action: "Submitted all pages to search engines", detail: `${urls.length} URLs` });
    return NextResponse.json({ submitted: urls.length });
  } catch (err) {
    console.error("[admin/seo/indexnow-submit-all] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
