"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminMerchant } from "@/components/admin/MerchantRow";
import { TEST_DEAL_LIMIT, testDealEndsAt, type TestDeal } from "@/lib/testDeals";

const nzTime = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function timeLeft(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m left`;
  return `${Math.floor(hours / 24)} days left`;
}

/**
 * Admin dashboard → Test deals (lib/testDeals.ts). Everyday and Flash
 * deals only an admin sees, on the private previews, with a timer that can
 * be restarted. New and Edit open the business "Create a deal" form in
 * test mode (app/admin/test-deals/new, …/[id]/edit), so a test deal is
 * made exactly like a real one. Nothing here touches Wix except "Copy to
 * real draft", which is explicit and makes an ordinary draft for the
 * business picked.
 */
export default function TestDealsPanel({ merchants }: { merchants: AdminMerchant[] | null }) {
  const [items, setItems] = useState<TestDeal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [copyFor, setCopyFor] = useState<string | null>(null);
  const [copyMerchant, setCopyMerchant] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/test-deals", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Couldn't load the test deals.");
      setItems(data.items ?? []);
      setNow(Date.now());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load the test deals.");
    }
  }, []);

  useEffect(() => {
    load();
    // Back from the form after saving (NewDealForm in test mode).
    const saved = new URLSearchParams(window.location.search).get("saved");
    if (saved) setNotice(saved === "new" ? "Test deal added. Its timer has started." : "Changes saved.");
  }, [load]);

  async function rowAction(id: string, run: () => Promise<Response>, done: string) {
    setBusyId(id);
    setRowError(null);
    setNotice(null);
    try {
      const res = await run();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRowError({ id, message: data?.error || "That didn't work. Please try again." });
        return null;
      }
      setNotice(done);
      await load();
      return data;
    } catch {
      setRowError({ id, message: "That didn't work. Check your connection and try again." });
      return null;
    } finally {
      setBusyId(null);
    }
  }

  const restart = (t: TestDeal) =>
    rowAction(
      t.id,
      () => fetch(`/api/admin/test-deals/${t.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restart" }) }),
      `Timer restarted for “${t.dealName}”.`
    );

  const remove = (t: TestDeal) => {
    if (!window.confirm(`Delete the test deal “${t.dealName}”? This can't be undone.`)) return;
    rowAction(t.id, () => fetch(`/api/admin/test-deals/${t.id}`, { method: "DELETE" }), "Test deal deleted.");
  };

  async function copy(t: TestDeal) {
    const merchant = merchants?.find((m) => m._id === copyMerchant);
    if (!merchant) {
      setRowError({ id: t.id, message: "Pick a business first." });
      return;
    }
    const data = await rowAction(
      t.id,
      () =>
        fetch(`/api/admin/test-deals/${t.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "copy", merchantId: merchant._id }),
        }),
      `Draft created for ${merchant.businessName || merchant.email}. They'll find it under My deals → Drafts, with a new code and no photo yet.`
    );
    if (data) {
      setCopyFor(null);
      setCopyMerchant("");
    }
  }

  const copyTargets = (merchants ?? [])
    .filter((m) => m.status !== "Suspended" && m.email)
    .sort((a, b) => (a.businessName || "").localeCompare(b.businessName || ""));


  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Test deals</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
            Everyday and Flash deals only you can see. Before launch they appear on the private homepage, category and
            Flash previews, marked “Test deal”. Nothing is charged or counted, and nothing goes to Wix.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Open homepage preview
          </Link>
          {(items?.length ?? 0) < TEST_DEAL_LIMIT && (
            <Link
              href="/admin/test-deals/new"
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              New test deal
            </Link>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      <div className="mt-5">
        {loadError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-red-600">{loadError}</p>
            <button onClick={load} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Try again
            </button>
          </div>
        ) : items === null ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No test deals yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {items.map((t) => {
              const endsAt = testDealEndsAt(t);
              const running = endsAt > now;
              const busy = busyId === t.id;
              return (
                <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.photo} alt="" className="aspect-[3/2] w-28 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{t.dealName}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          t.isFlash ? "bg-pink-100 text-pink-800" : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        {t.isFlash ? "Flash" : "Everyday"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          running ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {running ? `Running · ${timeLeft(endsAt - now)}` : "Timer ended"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t.businessName} · {t.category} · ${t.priceNow}
                      {t.priceWas !== null && ` (was $${t.priceWas})`} ·{" "}
                      {running ? `ends ${nzTime.format(endsAt)}` : `ended ${nzTime.format(endsAt)}`}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/test-deals/${t.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        View deal page
                      </Link>
                      <Link
                        href={`/admin/test-deals/${t.id}/edit`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => restart(t)}
                        disabled={busy}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Restart timer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCopyFor(copyFor === t.id ? null : t.id);
                          setCopyMerchant("");
                          setRowError(null);
                        }}
                        disabled={busy}
                        aria-expanded={copyFor === t.id}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Copy to real draft
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        disabled={busy}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>

                    {copyFor === t.id && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <p>
                          Creates a real <strong>draft</strong> for the business you pick, with a new deal code and no
                          photo or dates. They still add a photo, check it and submit it for approval, and it costs
                          credits only then. This test deal stays as it is.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`copy-${t.id}`}>
                            Business
                          </label>
                          <select
                            id={`copy-${t.id}`}
                            value={copyMerchant}
                            onChange={(e) => setCopyMerchant(e.target.value)}
                            className="min-w-0 max-w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm"
                          >
                            <option value="">{merchants === null ? "Loading businesses…" : "Choose a business…"}</option>
                            {copyTargets.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.businessName || m.email} {m.status && m.status !== "Approved" ? `(${m.status})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => copy(t)}
                            disabled={busy || !copyMerchant}
                            className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                          >
                            {busy ? "Creating…" : "Create draft"}
                          </button>
                        </div>
                      </div>
                    )}

                    {rowError?.id === t.id && (
                      <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                        {rowError.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Up to {TEST_DEAL_LIMIT} test deals. After launch they no longer appear in listings; each one&apos;s own page stays
        available here.
      </p>
    </div>
  );
}
