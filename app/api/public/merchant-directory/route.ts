import { NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";

// No request-derived data to force dynamic rendering automatically (unlike
// routes that read cookies/headers), so this must be opted in explicitly —
// otherwise Next tries to statically prerender it at build time, before
// WIX_API_KEY/WIX_SITE_ID are available to the build.
export const dynamic = "force-dynamic";

interface PublicBusiness {
  businessName: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}

/**
 * Public, read-only projection of "who's behind this deal" needed on the
 * storefront — business name, logo, and the contact details a customer
 * needs to reach the business directly (MegaDeal doesn't process any
 * customer payment; deals are ads, and redemption happens with the
 * business, not through this site) — keyed by deal/product id, deliberately
 * NOT by merchant email. The Merchants collection isn't publicly readable
 * (it's SITE_MEMBER_AUTHOR-scoped: a merchant can't see other merchants'
 * full records, including their email/login identity), so this route uses
 * the admin client to read and join Deals+Merchants server-side. Phone,
 * website and address are fine to expose here — a business advertising a
 * deal wants customers to see exactly this. Email is deliberately excluded:
 * it's the merchant's platform login, not a public contact channel, and
 * keying by product id means this endpoint can't be scraped for it either.
 */
export async function GET() {
  const adminClient = createWixAdminClient();
  const [dealsResult, merchantsResult] = await Promise.all([
    adminClient.items.query("Deals").find(),
    adminClient.items.query("Merchants").find(),
  ]);

  const businessByEmail: Record<string, PublicBusiness> = {};
  for (const m of merchantsResult.items ?? []) {
    if (m.email && m.businessName) {
      businessByEmail[String(m.email).toLowerCase()] = {
        businessName: m.businessName,
        logoUrl: m.logoUrl || null,
        website: m.website || null,
        phone: m.phone || null,
        address: m.address || null,
        city: m.city || null,
      };
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
}
