import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, hasValidAdminSignature } from "@/lib/adminCookie";
import ComingSoonV3 from "@/components/comingSoon/v3/ComingSoonV3";

/**
 * Admin-only preview of the coming-soon V3 design (owner's pack of 4 Oct
 * 2026), reached at /coming-soon?design=v3 (middleware.ts rewrites it here
 * for a signed-in admin). Checked again here, so this address shows
 * nothing to anyone else, and never cached or indexed. The public page is
 * unchanged.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coming soon (V3 preview)",
  robots: { index: false, follow: false },
};

export default async function ComingSoonV3Preview() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await hasValidAdminSignature(token))) redirect("/coming-soon");
  return <ComingSoonV3 />;
}
