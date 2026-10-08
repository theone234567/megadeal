"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MerchantRow, { type AdminMerchant } from "@/components/admin/MerchantRow";
import DealRow, { type AdminDeal } from "@/components/admin/DealRow";
import SubscriberRow, { type AdminSubscriber } from "@/components/admin/SubscriberRow";
import PlatformSettingsPanel from "@/components/admin/PlatformSettingsPanel";
import TestDealsPanel from "@/components/admin/TestDealsPanel";
import AnnouncementPanel from "@/components/admin/AnnouncementPanel";
import { missedScheduledStart } from "@/lib/dealSchedule";
import { readRevision } from "@/lib/dealRevision";
import { useWix } from "@/context/WixProvider";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isLoggedIn: businessAlsoActive, member: businessMember, logout: logoutBusiness } = useWix();
  const [signingOutBusiness, setSigningOutBusiness] = useState(false);
  const [tab, setTab] = useState<"merchants" | "deals" | "subscribers" | "tests" | "settings">("merchants");

  // ?tab=tests opens Test deals (the link back from a test deal's page).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "tests") setTab("tests");
  }, []);
  const [merchants, setMerchants] = useState<AdminMerchant[] | null>(null);
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [subscribers, setSubscribers] = useState<AdminSubscriber[] | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [bulkApproving, setBulkApproving] = useState(false);
  // null until loaded; the switch is hidden rather than shown in a guessed state.
  const [rudenessCheck, setRudenessCheck] = useState<boolean | null>(null);
  // Set when the AI deal check is off or failing: deals then wait for a person.
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [rudenessError, setRudenessError] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState<{ done: number; total: number; error: string | null } | null>(null);
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
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.rudenessCheck === "boolean") setRudenessCheck(d.rudenessCheck);
        const ai = d?.aiReview;
        if (!cancelled && ai) {
          if (!ai.configured) setAiNote("The AI deal check is off (ANTHROPIC_API_KEY isn't set), so every deal waits for you to approve it.");
          else if (ai.last && !ai.last.ok) {
            const when = new Date(ai.last.at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });
            setAiNote(`The AI deal check isn't working: ${ai.last.problem ?? "it failed"} (last tried ${when}). Until it's fixed, deals wait for you to approve them.`);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function toggleRudenessCheck() {
    if (rudenessCheck === null) return;
    const next = !rudenessCheck;
    setRudenessError(null);
    setRudenessCheck(next);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rudenessCheck: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setRudenessCheck(!next);
      setRudenessError("Couldn't save that. Please try again.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleSignOutBusiness() {
    setSigningOutBusiness(true);
    await logoutBusiness(`${window.location.origin}/admin`);
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
  const pendingPhotos = deals?.filter((d) => d.pendingPhotoUrl && d.status !== "Cancelled").length ?? 0;
  // Waiting for approval past their requested start (lib/dealSchedule.ts):
  // each needs a new start time before it can be approved.
  const missedStarts = deals?.filter((d) => missedScheduledStart(d)).length ?? 0;
  const changeRequests = deals?.filter((d) => readRevision(d)).length ?? 0;
  const attention = [
    { count: pendingMerchants, label: pendingMerchants === 1 ? "business waiting for approval" : "businesses waiting for approval", tab: "merchants" as const },
    { count: pendingDeals, label: pendingDeals === 1 ? "deal waiting for review" : "deals waiting for review", tab: "deals" as const },
    { count: missedStarts, label: missedStarts === 1 ? "deal whose start time passed before review" : "deals whose start time passed before review", tab: "deals" as const },
    { count: changeRequests, label: changeRequests === 1 ? "change request from a business" : "change requests from businesses", tab: "deals" as const },
    { count: pendingPhotos, label: pendingPhotos === 1 ? "new photo to approve" : "new photos to approve", tab: "deals" as const },
  ].filter((a) => a.count > 0);

  const merchantQuery = merchantSearch.toLowerCase().trim();
  const filteredMerchants = merchants?.filter((m) => {
    if (!merchantQuery) return true;
    return (
      (m.businessName || "").toLowerCase().includes(merchantQuery) ||
      (m.email || "").toLowerCase().includes(merchantQuery)
    );
  });

  const dealQuery = dealSearch.toLowerCase().trim();
  // Which business each deal belongs to, by the email on the deal.
  const businessByEmail = new Map(
    (merchants ?? [])
      .filter((m) => m.email)
      .map((m) => [String(m.email).toLowerCase(), { id: m._id, name: m.businessName || m.email || "" }])
  );
  const businessFor = (d: AdminDeal) => businessByEmail.get(String(d.merchantEmail || "").toLowerCase()) ?? null;

  const filteredDeals = deals?.filter((d) => {
    if (!dealQuery) return true;
    return (
      (d.dealName || "").toLowerCase().includes(dealQuery) ||
      (d.merchantEmail || "").toLowerCase().includes(dealQuery) ||
      (businessFor(d)?.name || "").toLowerCase().includes(dealQuery)
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

  // Runs the AI check on each pending deal (a few at a time, to stay well
  // inside rate limits): clean deals from approved businesses go live, the
  // rest stay pending with the AI's notes. Nothing is rejected.
  async function handleAiCheckPending() {
    if (!deals) return;
    const pending = deals.filter((d) => (d.status || "Live") === "Pending Approval");
    if (pending.length === 0) return;
    setAiChecking({ done: 0, total: pending.length, error: null });
    let firstError: string | null = null;
    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((d) => fetch(`/api/admin/deals/${d._id}/ai-review`, { method: "POST" }))
      );
      for (const r of results) {
        if (!r.ok && !firstError) firstError = (await r.json().catch(() => ({}))).error || "AI check failed.";
      }
      setAiChecking({ done: Math.min(i + 3, pending.length), total: pending.length, error: firstError });
      if (firstError && results.every((r) => !r.ok)) break;
    }
    const res = await fetch("/api/admin/deals");
    if (res.ok) {
      const data = await res.json();
      setDeals(data.items ?? []);
      setDealsRefreshKey((k) => k + 1);
    }
    setAiChecking((prev) => (prev && !prev.error ? null : prev));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Admin dashboard</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
          <Link href="/admin/audit" className="text-sm font-medium text-slate-500 hover:text-brand-700">
            Audit log
          </Link>
          <Link href="/admin/two-factor" className="text-sm font-medium text-slate-500 hover:text-brand-700">
            Two-factor sign-in
          </Link>
          <Link href="/admin/move-off-wix" className="text-sm font-medium text-slate-500 hover:text-brand-700">
            Moving off Wix
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-brand-700"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Before launch, these pages are visible only to a signed-in admin
          (middleware.ts); everyone else is sent to /coming-soon. "/?preview"
          rather than "/": a browser that visited before this existed may
          have cached the old permanent "/" → /coming-soon redirect, and a
          different URL sidesteps that cache. */}
      <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <p className="text-sm font-bold text-brand-900">Preview the customer site</p>
        <p className="mt-1 text-sm text-brand-800">
          Until launch, only you can see these pages while signed in here — everyone else sees
          Coming Soon. Use them to check test deals exactly as customers will see them.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { href: "/?preview", label: "Homepage" },
            { href: "/auckland", label: "Auckland" },
            { href: "/auckland/food-drink", label: "Food & Drink" },
            { href: "/auckland/beauty-spa", label: "Beauty & Spa" },
            { href: "/auckland/flash-deals", label: "Flash Deals" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 hover:ring-brand-300"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>

      {businessAlsoActive && (
        <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            ⚠️ You&apos;re also signed in as a business{businessMember?.email ? ` (${businessMember.email})` : ""}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Being signed into both at once gets confusing about which account you&apos;re acting
            as. Worth signing out of the business account while you&apos;re only using this admin
            dashboard.
          </p>
          <button
            onClick={handleSignOutBusiness}
            disabled={signingOutBusiness}
            className="mt-2 rounded-full border-2 border-amber-600 px-4 py-1.5 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            {signingOutBusiness ? "Signing out…" : "Sign out of business account"}
          </button>
        </div>
      )}

      {/* Needs attention (handoff pack, FINAL-SPEC §9): what's waiting on
          an admin, each a shortcut to the tab where it's dealt with.
          Change requests come from the portal's "Request a change". */}
      {merchants && deals && (
        <section aria-labelledby="needs-attention" className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 id="needs-attention" className="text-sm font-bold text-slate-900">
            Needs attention
          </h2>
          {aiNote && (
            <p role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {aiNote}
            </p>
          )}
          {attention.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">{aiNote ? "Nothing else is waiting on you." : "Nothing is waiting on you."}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {attention.map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => setTab(a.tab)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 hover:border-amber-300 hover:bg-amber-100"
                  >
                    <span className="font-extrabold">{a.count}</span> {a.label} →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
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
          {pendingPhotos > 0 && ` (${pendingPhotos} new photo${pendingPhotos === 1 ? "" : "s"})`}
        </button>
        <button
          onClick={() => setTab("subscribers")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "subscribers" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Subscribers
        </button>
        <button
          onClick={() => setTab("tests")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "tests" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Test deals
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === "settings" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Platform settings
        </button>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {tab === "merchants" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          {merchants === null ? (
            error ? null : <p className="text-sm text-slate-500">Loading…</p>
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
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Business</th>
                      <th className="pb-2 pr-4">Address</th>
                      <th className="pb-2 pr-4">Coupon</th>
                      <th className="pb-2 pr-4">Credits</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2"></th>
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
            error ? null : <p className="text-sm text-slate-500">Loading…</p>
          ) : deals.length === 0 ? (
            <p className="text-sm text-slate-500">No deals yet.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <input
                  type="search"
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  placeholder="Search by deal, business name or email…"
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
                {pendingDeals > 0 && (
                  <button
                    onClick={handleAiCheckPending}
                    title="Clean deals from approved businesses go live; anything else stays pending with the AI's notes"
                    disabled={aiChecking !== null && !aiChecking.error}
                    className="shrink-0 rounded-full border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
                  >
                    {aiChecking && !aiChecking.error
                      ? `AI checking… ${aiChecking.done}/${aiChecking.total}`
                      : `AI check pending (${pendingDeals})`}
                  </button>
                )}
                {aiChecking?.error && <p className="text-sm text-red-600">{aiChecking.error}</p>}
              </div>
              {rudenessCheck !== null && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rudenessCheck}
                    aria-labelledby="rudeness-label"
                    onClick={toggleRudenessCheck}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${rudenessCheck ? "bg-brand-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${rudenessCheck ? "left-[1.375rem]" : "left-0.5"}`}
                    />
                  </button>
                  <div className="text-sm">
                    <p id="rudeness-label" className="font-semibold text-slate-800">
                      Rudeness check {rudenessCheck ? "on" : "off"} for all businesses
                    </p>
                    <p className="text-xs text-slate-500">
                      Holds back swearing, crude humour and rude gestures. Hate, sexual and illegal content are
                      always checked. Override it for one business on its page.
                    </p>
                  </div>
                  {rudenessError && <p className="text-sm text-red-600">{rudenessError}</p>}
                </div>
              )}
              {filteredDeals && filteredDeals.length === 0 ? (
                <p className="text-sm text-slate-500">No deals match &quot;{dealSearch}&quot;.</p>
              ) : (
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4">Deal</th>
                      <th className="pb-2 pr-4">Business email</th>
                      <th className="pb-2 pr-4">Expires</th>
                      <th className="pb-2 pr-4">Deal status</th>
                      <th className="pb-2">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals?.map((d) => (
                      <DealRow key={`${d._id}-${dealsRefreshKey}`} deal={d} business={businessFor(d)} />
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
          <AnnouncementPanel />
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
              error ? null : <p className="text-sm text-slate-500">Loading…</p>
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
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
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

      {tab === "tests" && <TestDealsPanel merchants={merchants} />}
      {tab === "settings" && <PlatformSettingsPanel />}
    </main>
  );
}
