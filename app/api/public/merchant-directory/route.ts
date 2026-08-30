import { NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { mapMerchantToBusiness, type PublicBusiness } from "@/lib/business";

// No request-derived data to force dynamic rendering automatically (unlike
// routes that read cookies/headers), so this must be opted in explicitly —
// otherwise Next tries to statically prerender it at build time, before
// WIX_API_KEY/WIX_SITE_ID are available to the build.
export const dynamic = "force-dynamic";

/**
 * Public, read-only projection of "who's behind this deal" needed on the
 * storefront — business name, logo, and the contact details a customer
 * needs to reach the business directly (MegaDeal doesn't process any
 * customer payment; deals are ads, and redemption happens with the
 * business, not through this site) — keyed by deal/product id, deliberately
 * NOT by merchant email. The Merchants collection isn't publicly readable
 * (it's SITE_MEMBER_AUTHOR-scoped: a merchant can't see other merchants'
 * full records, including their email/login identity), so this route uses
 * the admin client to read and join Deals+Merchants server-side. Everything
 * a merchant fills in on their public business profile (bio, hours, social
 * links, price range, amenities, booking link/email, coordinates) is
 * included here too, so the deal page can show it without a separate
 * profile-page fetch. Deliberately excluded:
 * email (the merchant's platform login, not a public contact channel),
 * postcode, coupon/referral code, credits balance, and status — none of
 * those are ever shown to customers. Keying by product id (not email) means
 * this endpoint can't be scraped for the excluded fields either.
 */
export async function GET() {
  try {
    const adminClient = createWixAdminClient();
    const [dealsResult, merchantsResult] = await Promise.all([
      adminClient.items.query("Deals").find(),
      adminClient.items.query("Merchants").find(),
    ]);

    const businessByEmail: Record<string, PublicBusiness> = {};
    for (const m of merchantsResult.items ?? []) {
      if (m.email && m.businessName && m._id) {
        businessByEmail[String(m.email).toLowerCase()] = mapMerchantToBusiness(m);
      }
    }

    const directory: Record<string, PublicBusiness> = {};
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
  } catch (err) {
    console.error("[public/merchant-directory] failed", err);
    // Degrade gracefully — deals still render without business info rather
    // than the whole request failing.
    return NextResponse.json({ directory: {} }, { status: 200 });
  }
}
