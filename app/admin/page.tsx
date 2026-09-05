"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MerchantRow, { type AdminMerchant } from "@/components/admin/MerchantRow";
import DealRow, { type AdminDeal } from "@/components/admin/DealRow";
import SubscriberRow, { type AdminSubscriber } from "@/components/admin/SubscriberRow";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"merchants" | "deals" | "subscribers">("merchants");
  const [merchants, setMerchants] = useState<AdminMerchant[] | null>(null);
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [subscribers, setSubscribers] = useState<AdminSubscriber[] | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [bulkApproving, setBulkApproving] = useState(false);
  const [dealsRefreshKey, setDealsRefreshKey] = useState(0);
  const [indexNowStatus, setIndexNowStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [merchantsRes, dealsRes, subscribersRes] = await Promise.all([
        fetch("/api/admin/merchants"),
        fetch("/api/admin/deals"),
        fetch("/api/admin/email-signups"),
      ]);

      if (merchantsRes.status === 401 || dealsRes.status === 401 || subscribersRes.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!merchantsRes.ok || !dealsRes.ok || !subscribersRes.ok) {
        if (!cancelled) setError("Couldn't load admin data.");
        return;
      }

      const merchantsData = await merchantsRes.json();
      const dealsData = await dealsRes.json();
      const subscribersData = await subscribersRes.json();
      if (!cancelled) {
        setMerchants(merchantsData.items ?? []);
        setDeals(dealsData.items ?? []);
        setSubscribers(subscribersData.items ?? []);
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

  async function handleIndexNowSubmitAll() {
    setIndexNowStatus("submitting");
    try {
      const res = await fetch("/api/admin/seo/indexnow-submit-all", { method: "POST" });
      setIndexNowStatus(res.ok ? "done" : "error");
    } catch {
      setIndexNowStatus("error");
    }
  }

  const pendingMerchants = merchants?.filter((m) => (m.status || "Pending") === "Pending").length ?? 0;
  const pendingDeals = deals?.filter((d) => (d.status || "Live") === "Pending Approval").length ?? 0;

  const merchantQuery = merchantSearch.toLowerCase().trim();
  const filteredMerchants = merchants?.filter((m) => {
    if (!merchantQuery) return true;
    return (
      (m.businessName || "").toLowerCase().includes(merchantQuery) ||
      (m.email || "").toLowerCase().includes(merchantQuery)
    );
  });

  const dealQuery = dealSearch.toLowerCase().trim();
  const filteredDeals = deals?.filter((d) => {
    if (!dealQuery) return true;
    return (
      (d.dealName || "").toLowerCase().includes(dealQuery) ||
      (d.merchantEmail || "").toLowerCase().includes(dealQuery)
    );
  });

  async function handleBulkApprove() {
    if (!deals) return;
    const pending = deals.filter((d) => (d.status || "Live") === "Pending Approval");
    if (pending.length === 0) return;
    setBulkApproving(true);
    try {
      await Promise.all(
        pending.map((d) =>
          fetch(`/api/admin/deals/${d._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Live" }),
          })
        )
      );
      // Refetch rather than patch local state — DealRow keeps its own
      // status state initialized from the deal prop on mount, so a purely
      // local update here wouldn't be reflected in each row's dropdown.
      const res = await fetch("/api/admin/deals");
      if (res.ok) {
        const data = await res.json();
        setDeals(data.items ?? []);
        // DealRow keys include this so the rows remount and re-sync their
        // internal status state from the freshly-fetched props.
        setDealsRefreshKey((k) => k + 1);
      }
    } finally {
      setBulkApproving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleIndexNowSubmitAll}
            disabled={indexNowStatus === "submitting"}
            title="Push every live page to Bing/Yandex via IndexNow instead of waiting for them to crawl it on their own"
            className="text-sm font-medium text-slate-500 hover:text-brand-700 disabled:opacity-60"
          >
            {indexNowStatus === "submitting"
              ? "Submitting to Bing…"
              : indexNowStatus === "done"
              ? "Submitted ✓"
              : indexNowStatus === "error"
              ? "Submission failed — retry"
              : "Submit all pages to Bing"}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-brand-700"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setTab("merchants")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "merchants" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Businesses{pendingMerchants > 0 && ` (${pendingMerchants} pending)`}
        </button>
        <button
          onClick={() => setTab("deals")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "deals" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Deals{pendingDeals > 0 && ` (${pendingDeals} pending)`}
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "subscribers" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Subscribers
        </button>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {tab === "merchants" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          {merchants === null ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-slate-500">No business applications yet.</p>
          ) : (
            <>
              <input
                type="search"
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                placeholder="Search by business name or email…"
                className="mb-4 w-full max-w-sm rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
              />
              {filteredMerchants && filteredMerchants.length === 0 ? (
                <p className="text-sm text-slate-500">No businesses match &quot;{merchantSearch}&quot;.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-4">Business</th>
                      <th className="pb-2 pr-4">Address</th>
                      <th className="pb-2 pr-4">Coupon</th>
                      <th className="pb-2 pr-4">Credits</th>
                      <th className="pb-2 pr-4">Rating</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerchants?.map((m) => (
                      <MerchantRow key={m._id} merchant={m} />
                    ))}
                  </tbody>
                </table>
              )}
            </>
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
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <input
                  type="search"
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  placeholder="Search by deal name or business email…"
                  className="w-full max-w-sm rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-400"
                />
                {pendingDeals > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkApproving}
                    className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95 disabled:opacity-60"
                  >
                    {bulkApproving
                      ? "Approving…"
                      : `Approve all pending (${pendingDeals})`}
                  </button>
                )}
              </div>
              {filteredDeals && filteredDeals.length === 0 ? (
                <p className="text-sm text-slate-500">No deals match &quot;{dealSearch}&quot;.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-4">Deal</th>
                      <th className="pb-2 pr-4">Business email</th>
                      <th className="pb-2 pr-4">Expires</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals?.map((d) => (
                      <DealRow key={`${d._id}-${dealsRefreshKey}`} deal={d} />
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {tab === "subscribers" && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Verified only (safe to email)
            </label>
            <a
              href={`/api/admin/email-signups/export${verifiedOnly ? "?verifiedOnly=true" : ""}`}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Export CSV
            </a>
          </div>

          <div className="mt-4 overflow-x-auto">
            {subscribers === null ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              (() => {
                const filtered = verifiedOnly
                  ? subscribers.filter((s) => s.verified && !s.unsubscribed)
                  : subscribers;
                return filtered.length === 0 ? (
                  <p className="text-sm text-slate-500">No signups yet.</p>
                ) : (
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2 pr-4">Audience</th>
                        <th className="pb-2 pr-4">Source</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2">Signed up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <SubscriberRow key={s._id} subscriber={s} />
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}
          </div>
        </div>
      )}
    </main>
  );
}
