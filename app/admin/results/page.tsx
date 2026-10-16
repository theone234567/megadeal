import type { Metadata } from "next";
import Link from "next/link";
import DealResultsPanel from "@/components/portal/DealResultsPanel";

export const metadata: Metadata = { title: "Deal results", robots: { index: false, follow: false } };

/** What customers did with every business's deals together (admins only:
 *  the figures come from /api/admin/deal-stats, which checks). */
export default function AdminResultsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-brand-700">
        ← Admin dashboard
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold text-slate-900">Deal results, all businesses</h1>
      <DealResultsPanel endpoint="/api/admin/deal-stats" title="All deals" />
    </main>
  );
}
