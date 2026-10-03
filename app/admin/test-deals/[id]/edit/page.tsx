import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { getTestDeal } from "@/lib/testDealStore";
import NewDealForm from "@/app/portal/new-deal/NewDealForm";

export const dynamic = "force-dynamic";

/** Edit an admin test deal in the business "Create a deal" form. */
export default async function EditTestDealPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(token))) redirect("/admin/login");
  const test = await getTestDeal(id);
  if (!test) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-600">This test deal no longer exists.</p>
        <Link href="/admin?tab=tests" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
          ← Back to test deals
        </Link>
      </main>
    );
  }
  return (
    <Suspense fallback={null}>
      <NewDealForm siteLaunched={SITE_LAUNCHED} testMode={{ id, initial: test }} />
    </Suspense>
  );
}
