import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, hasValidAdminSignature } from "@/lib/adminCookie";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import BusinessLandingV2 from "@/components/business/BusinessLandingV2";

/**
 * Admin-only preview of the redesigned /list-your-business, reached at
 * /list-your-business?design=v2 (middleware.ts rewrites it here for a
 * signed-in admin). Checked again here, so this address shows nothing to
 * anyone else, and never cached or indexed. Visitors keep whichever design
 * LIST_BUSINESS_DESIGN selects. The signup on it is the real one.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "List your business (V2 preview)",
  robots: { index: false, follow: false },
};

export default async function ListBusinessV2Preview() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await hasValidAdminSignature(token))) redirect("/list-your-business");
  return <BusinessLandingV2 launched={SITE_LAUNCHED} />;
}
