"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MerchantRow, { type AdminMerchant } from "@/components/admin/MerchantRow";
import DealRow, { type AdminDeal } from "@/components/admin/DealRow";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"merchants" | "deals">("merchants");
  const [merchants, setMerchants] = useState<AdminMerchant[] | null>(null);
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [merchantsRes, dealsRes] = await Promise.all([
        fetch("/api/admin/merchants"),
        fetch("/api/admin/deals"),
      ]);

      if (merchantsRes.status === 401 || dealsRes.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!merchantsRes.ok || !dealsRes.ok) {
        if (!cancelled) setError("Couldn't load admin data.");
        return;
      }

      const merchantsData = await merchantsRes.json();
      const dealsData = await dealsRes.json();
      if (!cancelled) {
        setMerchants(merchantsData.items ?? []);
        setDeals(dealsData.items ?? []);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const pendingMerchants = merchants?.filter((m) => (m.status || "Pending") === "Pending").length ?? 0;
  const pendingDeals = deals?.filter((d) => (d.status || "Live") === "Pending Approval").length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("merchants")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "merchants" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Merchants{pendingMerchants > 0 && ` (${pendingMerchants} pending)`}
        </button>
        <button
          onClick={() => setTab("deals")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "deals" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Deals{pendingDeals > 0 && ` (${pendingDeals} pending)`}
        </button>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {tab === "merchants" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          {merchants === null ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-slate-500">No merchant applications yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Business</th>
                  <th className="pb-2 pr-4">Address</th>
                  <th className="pb-2 pr-4">Coupon</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Save</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <MerchantRow key={m._id} merchant={m} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "deals" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          {deals === null ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : deals.length === 0 ? (
            <p className="text-sm text-slate-500">No deals yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Deal</th>
                  <th className="pb-2 pr-4">Merchant email</th>
                  <th className="pb-2 pr-4">Expires</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Save</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <DealRow key={d._id} deal={d} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
