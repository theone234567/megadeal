import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import NewDealForm from "@/app/portal/new-deal/NewDealForm";

export const dynamic = "force-dynamic";

/** A new admin test deal, made with the business "Create a deal" form. */
export default async function NewTestDealPage() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(token))) redirect("/admin/login");
  return (
    <Suspense fallback={null}>
      <NewDealForm siteLaunched={SITE_LAUNCHED} testMode={{ id: null, initial: null }} />
    </Suspense>
  );
}
