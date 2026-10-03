"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminMerchant } from "@/components/admin/MerchantRow";
import { BOOKING_CHOICES } from "@/lib/booking";
import { CATEGORIES } from "@/lib/categories";
import { EVERYDAY_DURATION_OPTIONS, FLASH_DURATION_OPTIONS } from "@/lib/dealDuration";
import {
  TEST_DEAL_LIMIT,
  TEST_DEAL_PHOTOS,
  testDealDurationValue,
  testDealEndsAt,
  type TestDeal,
} from "@/lib/testDeals";

interface Form {
  isFlash: boolean;
  duration: string;
  name: string;
  businessName: string;
  suburb: string;
  category: string;
  priceNow: string;
  priceWas: string;
  photo: string;
  bookingRequirement: string;
  dealCode: string;
  description: string;
  terms: string;
}

const EMPTY_FORM: Form = {
  isFlash: false,
  duration: "7",
  name: "",
  businessName: "",
  suburb: "",
  category: "",
  priceNow: "",
  priceWas: "",
  photo: TEST_DEAL_PHOTOS[0].src,
  bookingRequirement: "",
  dealCode: "",
  description: "",
  terms: "",
};

function toForm(t: TestDeal): Form {
  return {
    isFlash: t.isFlash,
    duration: String(testDealDurationValue(t)),
    name: t.name,
    businessName: t.businessName,
    suburb: t.suburb,
    category: t.category,
    priceNow: String(t.priceNow),
    priceWas: String(t.priceWas),
    photo: t.photo,
    bookingRequirement: t.bookingRequirement,
    dealCode: t.dealCode,
    description: t.description,
    terms: t.terms,
  };
}

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

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
const labelClass = "block text-sm font-semibold text-slate-700";

/**
 * Admin dashboard → Test deals (lib/testDeals.ts). Everyday and Flash
 * deals only an admin sees, on the private previews, with a timer that can
 * be restarted. Nothing here touches Wix except "Copy to real draft",
 * which is explicit and makes an ordinary draft for the business picked.
 */
export default function TestDealsPanel({ merchants }: { merchants: AdminMerchant[] | null }) {
  const [items, setItems] = useState<TestDeal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
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
  }, [load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function startNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setErrors([]);
    setNotice(null);
  }

  function startEdit(t: TestDeal) {
    setEditing(t.id);
    setForm(toForm(t));
    setErrors([]);
    setNotice(null);
  }

  function chooseType(isFlash: boolean) {
    setForm((f) => (f.isFlash === isFlash ? f : { ...f, isFlash, duration: isFlash ? "60" : "7" }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const isNew = editing === "new";
    try {
      const res = await fetch(isNew ? "/api/admin/test-deals" : `/api/admin/test-deals/${editing}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal: { ...form, duration: Number(form.duration) } }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(data?.errors?.length ? data.errors : [data?.error || "Couldn't save the test deal."]);
        return;
      }
      setEditing(null);
      setNotice(isNew ? "Test deal added. Its timer has started." : "Changes saved.");
      await load();
    } catch {
      setErrors(["Couldn't save the test deal. Check your connection and try again."]);
    } finally {
      setSaving(false);
    }
  }

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
      `Timer restarted for “${t.name}”.`
    );

  const remove = (t: TestDeal) => {
    if (!window.confirm(`Delete the test deal “${t.name}”? This can't be undone.`)) return;
    if (editing === t.id) setEditing(null);
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

  const durationOptions = form.isFlash
    ? FLASH_DURATION_OPTIONS.map((o) => ({ value: String(o.minutes), label: o.label }))
    : EVERYDAY_DURATION_OPTIONS.map((o) => ({ value: String(o.days), label: o.label }));

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
          {editing === null && (
            <button
              type="button"
              onClick={startNew}
              disabled={(items?.length ?? 0) >= TEST_DEAL_LIMIT}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              New test deal
            </button>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      {editing !== null && (
        <form onSubmit={save} className="mt-5 rounded-xl border border-slate-200 p-4 sm:p-5" noValidate>
          <h3 className="text-base font-extrabold text-slate-900">{editing === "new" ? "New test deal" : "Edit test deal"}</h3>

          <fieldset className="mt-4">
            <legend className={labelClass}>Deal type</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {[
                { flash: false, title: "Everyday deal", hint: "Runs for days" },
                { flash: true, title: "Flash deal", hint: "Runs for minutes or hours, with a countdown" },
              ].map((o) => (
                <label
                  key={o.title}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
                    form.isFlash === o.flash ? "border-brand-600 bg-brand-50" : "border-slate-200"
                  }`}
                >
                  <input type="radio" name="test-type" checked={form.isFlash === o.flash} onChange={() => chooseType(o.flash)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{o.title}</span>
                    <span className="block text-xs text-slate-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Deal name
              <input className={inputClass} value={form.name} maxLength={200} onChange={(e) => set("name", e.target.value)} />
            </label>
            <label className={labelClass}>
              Business name shown
              <input className={inputClass} value={form.businessName} maxLength={120} onChange={(e) => set("businessName", e.target.value)} />
            </label>
            <label className={labelClass}>
              Suburb <span className="font-normal text-slate-500">(optional)</span>
              <input className={inputClass} value={form.suburb} maxLength={80} onChange={(e) => set("suburb", e.target.value)} />
            </label>
            <label className={labelClass}>
              Category
              <select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Runs for
              <select className={inputClass} value={form.duration} onChange={(e) => set("duration", e.target.value)}>
                {durationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Deal price ($)
              <input className={inputClass} inputMode="decimal" value={form.priceNow} onChange={(e) => set("priceNow", e.target.value)} />
            </label>
            <label className={labelClass}>
              Usual price ($)
              <input className={inputClass} inputMode="decimal" value={form.priceWas} onChange={(e) => set("priceWas", e.target.value)} />
            </label>
            <label className={labelClass}>
              Booking
              <select className={inputClass} value={form.bookingRequirement} onChange={(e) => set("bookingRequirement", e.target.value)}>
                <option value="">Choose…</option>
                {BOOKING_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Deal code <span className="font-normal text-slate-500">(optional)</span>
              <input className={inputClass} value={form.dealCode} maxLength={20} onChange={(e) => set("dealCode", e.target.value)} />
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className={labelClass}>Photo</legend>
            <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-7">
              {TEST_DEAL_PHOTOS.map((p) => (
                <label
                  key={p.src}
                  className={`cursor-pointer overflow-hidden rounded-lg border-2 ${form.photo === p.src ? "border-brand-600" : "border-transparent"}`}
                >
                  <input type="radio" name="test-photo" className="sr-only" checked={form.photo === p.src} onChange={() => set("photo", p.src)} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.label} className="aspect-[3/2] w-full object-cover" />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4">
            <label className={labelClass}>
              Description <span className="font-normal text-slate-500">(optional)</span>
              <textarea className={inputClass} rows={3} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <label className={labelClass}>
              Conditions <span className="font-normal text-slate-500">(optional)</span>
              <textarea className={inputClass} rows={2} maxLength={2000} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
            </label>
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="mt-4 space-y-1 text-sm font-semibold text-red-700">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing === "new" ? "Add test deal" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {editing !== "new" && <p className="mt-2 text-xs text-slate-500">Saving keeps the timer running from when it last started.</p>}
        </form>
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
                      <p className="font-bold text-slate-900">{t.name}</p>
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
                      {t.businessName} · {t.category} · ${t.priceNow} (was ${t.priceWas}) ·{" "}
                      {running ? `ends ${nzTime.format(endsAt)}` : `ended ${nzTime.format(endsAt)}`}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/admin/test-deals/${t.id}`}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        View deal page
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        disabled={busy}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
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
