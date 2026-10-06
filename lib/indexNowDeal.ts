import "server-only";
import { flashDealsPath } from "./cities";
import { after } from "next/server";
import { submitUrlsToIndexNow } from "./indexNow";
import { SITE_URL, SITE_LAUNCHED } from "./siteConfig";
import { isScheduledFuture } from "./dealSchedule";
import { CATEGORY_NAME_BY_ID, categoryPath } from "./categories";
import { unwrapProduct } from "./mapDeal";
import { businessSlug } from "./slug";

/**
 * Tells Bing (and the other IndexNow engines) about every page a deal
 * change touches: the deal itself, its category pages, its business's
 * page, the homepage and, for a flash deal, /flash-deals.
 *
 * Call it whenever a deal goes live, changes while live, or stops being
 * live (paused, cancelled, sold out). Bing leans on IndexNow far more
 * than Google does — without a ping, a newer site like this one can wait
 * days for Bing to notice a new deal, and keep showing an ended one.
 *
 * Runs after the response via `after()`, so it never slows the request
 * or fails it. Does nothing before launch, when these pages redirect to
 * /coming-soon for everyone but admins.
 */
export function notifyDealChanged(
  adminClient: any,
  deal: Record<string, any> | null | undefined,
  merchant?: Record<string, any> | null
): void {
  if (!SITE_LAUNCHED || !deal?.productId) return;
  // Approved but not started yet: its pages aren't public until then. The
  // hourly job tells search engines once it starts
  // (app/api/cron/expired-deals).
  if (deal.status === "Live" && isScheduledFuture(deal)) return;
  const run = async () => {
    try {
      const urls = [`${SITE_URL}/`];
      if (deal.isFlash) urls.push(`${SITE_URL}${flashDealsPath()}`);

      const product = unwrapProduct(
        await adminClient.productsV3.getProduct(deal.productId, { fields: ["ALL_CATEGORIES_INFO"] } as any)
      );
      if (product?.slug) urls.push(`${SITE_URL}/deal/${product.slug}`);
      for (const c of product?.allCategoriesInfo?.categories ?? []) {
        const name = CATEGORY_NAME_BY_ID[c?.id];
        if (name) urls.push(`${SITE_URL}${categoryPath(name)}`);
      }

      let owner = merchant;
      if (!owner && deal.merchantEmail) {
        const res = await adminClient.items.query("Merchants").eq("email", deal.merchantEmail).limit(1).find();
        owner = res.items?.[0] ?? null;
      }
      // Business pages only exist for approved businesses.
      if (owner?.businessName && owner?._id && owner.status === "Approved") {
        urls.push(`${SITE_URL}/business/${businessSlug(owner.businessName, owner._id)}`);
      }

      await submitUrlsToIndexNow([...new Set(urls)]);
    } catch (err) {
      console.error("[indexNowDeal] couldn't work out which pages to submit", err);
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request (e.g. a script): just run it.
    void run();
  }
}

/** Same, for a business's own page after its profile changes. */
export function notifyBusinessChanged(merchant: Record<string, any> | null | undefined): void {
  if (!SITE_LAUNCHED || !merchant?.businessName || !merchant?._id || merchant.status !== "Approved") return;
  const url = `${SITE_URL}/business/${businessSlug(merchant.businessName, merchant._id)}`;
  try {
    after(() => submitUrlsToIndexNow([url]));
  } catch {
    void submitUrlsToIndexNow([url]);
  }
}
