import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/adminSession";
import { fetchDealForAdminPreview } from "@/lib/fetchDealServer";
import { aiSummary, effectiveVerdict } from "@/lib/aiReview";
import { DEAL_STATUS_STYLES } from "@/lib/dealStatus";
import DealCard from "@/components/DealCard";
import DealDetail from "@/app/deal/[slug]/DealDetail";
import type { DealStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The deal as customers will see it — card and full page — whatever its
 * status, so an admin can judge a pending deal before approving it. The
 * public /deal page only exists once a deal is live. Rendered in preview
 * mode: no view or reveal is recorded, and share/profile links are off.
 */
export default async function AdminDealPreviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(token))) redirect("/admin/login");

  const result = await fetchDealForAdminPreview(id);
  if (!result) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-600">This deal couldn&apos;t be loaded — it may have no Wix product yet.</p>
        <Link href="/admin" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
          ← Back to admin
        </Link>
      </main>
    );
  }

  const { deal, record } = result;
  const status = (record.status ?? "Live") as DealStatus;
  const summary = aiSummary(record.aiReview);
  const verdict = record.aiReview ? effectiveVerdict(record.aiReview) : null;

  return (
    <div className="pb-10">
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6 lg:px-8">
          <Link href="/admin" className="font-semibold text-brand-700 hover:underline">
            ← Back to admin
          </Link>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DEAL_STATUS_STYLES[status] ?? ""}`}>
            {status}
          </span>
          <span className="text-amber-900">
            Admin preview — {status === "Live" ? "this is how the live deal looks." : "customers can't see this deal yet."}
          </span>
          {summary && (
            <span
              className={`font-semibold ${
                verdict === "approve" ? "text-emerald-700" : verdict === "reject" ? "text-red-600" : "text-amber-800"
              }`}
            >
              {summary}
            </span>
          )}
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
