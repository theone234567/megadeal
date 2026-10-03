import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { getTestDeal } from "@/lib/testDealStore";
import { testDealEndsAt, testDealToDeal } from "@/lib/testDeals";
import DealCard from "@/components/DealCard";
import DealDetail from "@/app/deal/[slug]/DealDetail";

export const dynamic = "force-dynamic";

/**
 * A test deal's page (lib/testDeals.ts), as customers would see it. Only
 * test deal cards link here; the public /deal pages never show one. Shown
 * in preview mode: nothing is counted and contact links are off.
 */
export default async function AdminTestDealPage(props: { params: Promise<{ id: string }> }) {
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

  const deal = testDealToDeal(test);
  const ended = testDealEndsAt(test) <= Date.now();

  return (
    <div className="pb-10">
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link href="/admin?tab=tests" className="font-semibold text-brand-700 hover:underline">
            ← Back to test deals
          </Link>
          <span className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-bold text-amber-900">
            Test deal{ended ? " · timer ended" : ""}
          </span>
          <span className="text-amber-900">Only admins can see this. It isn&apos;t a real offer and nothing here is counted.</span>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">As a card in listings</p>
        <div className="mt-2 max-w-xs">
          <DealCard deal={deal} preview />
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-wide text-slate-500">The deal page</p>
      </div>
      <DealDetail deal={deal} preview />
    </div>
  );
}
