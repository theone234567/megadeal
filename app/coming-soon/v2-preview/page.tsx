import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, hasValidAdminSignature } from "@/lib/adminCookie";
import ComingSoonV2 from "@/components/comingSoon/v2/ComingSoonV2";

/**
 * Admin-only preview of the coming-soon V2 design, reached at
 * /coming-soon?design=v2 (middleware.ts rewrites it here for a signed-in
 * admin). Checked again here, so this address shows nothing to anyone else,
 * and never cached or indexed. Public visitors keep whichever design
 * COMING_SOON_DESIGN selects.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coming soon (V2 preview)",
  robots: { index: false, follow: false },
};

export default async function ComingSoonV2Preview() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await hasValidAdminSignature(token))) redirect("/coming-soon");
  return <ComingSoonV2 />;
}
