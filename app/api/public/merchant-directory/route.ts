import { NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";

// No request-derived data to force dynamic rendering automatically (unlike
// routes that read cookies/headers), so this must be opted in explicitly —
// otherwise Next tries to statically prerender it at build time, before
// WIX_API_KEY/WIX_SITE_ID are available to the build.
export const dynamic = "force-dynamic";

/**
 * Public, read-only projection of merchant info needed to show "who's
 * behind this deal" on the storefront (business name + logo), keyed by
 * email. The Merchants collection itself isn't publicly readable (it's
 * SITE_MEMBER_AUTHOR-scoped so a merchant can't see other merchants' full
 * records — address, phone, credits balance, etc.), so this route uses the
 * admin client to read it server-side and re-exposes only the fields that
 * are safe and meant to be public once a merchant has a live deal.
 */
export async function GET() {
  const adminClient = createWixAdminClient();
  const result = await adminClient.items.query("Merchants").find();

  const directory: Record<string, { businessName: string; logoUrl: string | null }> = {};
  for (const m of result.items ?? []) {
    if (m.email && m.businessName) {
      directory[String(m.email).toLowerCase()] = {
        businessName: m.businessName,
        logoUrl: m.logoUrl || null,
      };
    }
  }

  return NextResponse.json(
    { directory },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
