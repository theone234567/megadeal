import { NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";

// No request-derived data to force dynamic rendering automatically (unlike
// routes that read cookies/headers), so this must be opted in explicitly —
// otherwise Next tries to statically prerender it at build time, before
// WIX_API_KEY/WIX_SITE_ID are available to the build.
export const dynamic = "force-dynamic";

/**
 * Public, read-only projection of "who's behind this deal" (business name
 * + logo) needed on the storefront, keyed by deal/product id — deliberately
 * NOT by merchant email. The Merchants collection isn't publicly readable
 * (it's SITE_MEMBER_AUTHOR-scoped: a merchant can't see other merchants'
 * full records — address, phone, credits balance, email), so this route
 * uses the admin client to read and join Deals+Merchants server-side and
 * re-exposes only businessName/logoUrl. Keying by product id rather than
 * email means this endpoint can't be scraped for merchants' email
 * addresses, which product ids alone never reveal.
 */
export async function GET() {
  const adminClient = createWixAdminClient();
  const [dealsResult, merchantsResult] = await Promise.all([
    adminClient.items.query("Deals").find(),
    adminClient.items.query("Merchants").find(),
  ]);

  const businessByEmail: Record<string, { businessName: string; logoUrl: string | null }> = {};
  for (const m of merchantsResult.items ?? []) {
    if (m.email && m.businessName) {
      businessByEmail[String(m.email).toLowerCase()] = {
        businessName: m.businessName,
        logoUrl: m.logoUrl || null,
      };
    }
  }

  const directory: Record<string, { businessName: string; logoUrl: string | null }> = {};
  for (const deal of dealsResult.items ?? []) {
    const business = deal.merchantEmail
      ? businessByEmail[String(deal.merchantEmail).toLowerCase()]
      : undefined;
    if (deal.productId && business) {
      directory[deal.productId] = business;
    }
  }

  return NextResponse.json(
    { directory },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
