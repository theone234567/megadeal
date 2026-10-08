"use client";

import { useState } from "react";
import DealResults from "@/components/DealResults";
import type { DealStatus } from "@/lib/types";
import Link from "next/link";
import DealContentEditor from "./DealContentEditor";
import { aiSummary, effectiveVerdict } from "@/lib/aiReview";
import { describeMinutes } from "@/lib/dealDuration";
import { dealDisplayStatus } from "@/lib/dealStatus";
import { isScheduledFuture, missedScheduledStart, startLabel } from "@/lib/dealSchedule";
import { nzDateTimeParts } from "@/lib/nzTime";
import { readRevision, revisionLines } from "@/lib/dealRevision";

export interface AdminDeal {
  _id: string;
  dealName?: string;
  productId?: string;
  expiresAt?: string;
  status?: DealStatus | string;
  photoUrl?: string;
  merchantEmail?: string;
  statusNote?: string | null;
  dealCode?: string | null;
  [key: string]: any;
}

// "Draft" is deliberately absent: a draft never reaches this table (see
// /api/admin/deals), and offering it here would let an admin push a
// submitted deal back into a state the merchant alone controls.
const STATUSES: DealStatus[] = ["Pending Approval", "Live", "Paused", "Cancelled"];

function toDateInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function DealRow({
  deal: initialDeal,
  business = null,
  onSaved,
}: {
  deal: AdminDeal;
  /** The business this deal belongs to, when one matches its email. */
  business?: { id: string; name: string } | null;
  /** Called with the deal as saved, so the page's counts (Needs attention) update. */
  onSaved?: (deal: AdminDeal) => void;
}) {
  const [deal, setDeal] = useState(initialDeal);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [status, setStatus] = useState<string>(deal.status || "Live");
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(deal.expiresAt));
  const [merchantEmail, setMerchantEmail] = useState(deal.merchantEmail || "");
  const [note, setNote] = useState(deal.statusNote || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusChangedToPausedOrCancelled =
    status !== (deal.status || "Live") && (status === "Paused" || status === "Cancelled");

  const dirty =
    status !== (deal.status || "Live") ||
    expiresAt !== toDateInputValue(deal.expiresAt) ||
    merchantEmail !== (deal.merchantEmail || "") ||
    note !== (deal.statusNote || "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${deal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          // Only when changed: re-sending the date-only value on every save
          // used to move a Flash Deal's end time to midnight.
          ...(expiresAt !== toDateInputValue(deal.expiresAt)
            ? { expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }
            : {}),
          merchantEmail,
          note,
        }),
      });
      if (!res.ok) {
        // Say why, instead of a bare "Save failed" — most often the admin
        // session has run out (they last 12 hours).
        if (res.status === 401) throw new Error("Your admin session has expired — sign in again.");
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (error ${res.status}). Refresh the page and try again.`);
      }
      // Approval can set the end date server-side (the run starts when a
      // deal first goes live), so take it from the saved record.
      const savedBody = await res.json().catch(() => ({}));
      const savedDeal: AdminDeal = {
        ...deal,
        status,
        expiresAt: savedBody?.item?.expiresAt ?? (expiresAt ? new Date(expiresAt).toISOString() : undefined),
        merchantEmail,
        statusNote: note || null,
      };
      setDeal(savedDeal);
      setExpiresAt(toDateInputValue(savedDeal.expiresAt));
      onSaved?.(savedDeal);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      // Saved, but something alongside it didn't happen (the business's email).
      if (Array.isArray(savedBody?.warnings) && savedBody.warnings.length) setError(savedBody.warnings.join(" "));
    } catch (err: any) {
      setError(err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <>
    <tr className="border-b border-slate-100 align-top">
      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          {deal.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.photoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
              🏷️
            </span>
          )}
          <div>
            <p className="font-semibold text-slate-800">
              {deal.isFlash && <span className="mr-1 text-brand-600">⚡</span>}
              {deal.dealName || "Untitled"} {detailsOpen ? "▲" : "▼"}
            </p>
            {deal.pendingPhotoUrl && (
              <p className="text-xs font-bold text-amber-700">New photo to approve</p>
            )}
            {readRevision(deal) && <p className="text-xs font-bold text-amber-700">Change requested</p>}
            {aiSummary(deal.aiReview) && (
              <p
                className={`text-xs font-semibold ${
                  effectiveVerdict(deal.aiReview) === "approve"
                    ? "text-emerald-700"
                    : effectiveVerdict(deal.aiReview) === "reject"
                    ? "text-red-600"
                    : "text-amber-700"
                }`}
              >
                {aiSummary(deal.aiReview)}
              </p>
            )}
            <p className="text-xs text-slate-500">{deal.productId ? `${deal.productId.slice(0, 8)}…` : "no linked product"}</p>
          </div>
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-xs">
          {business && (
            <Link href={`/admin/businesses/${business.id}`} className="font-semibold text-slate-700 hover:text-brand-700 hover:underline">
              {business.name}
            </Link>
          )}
          {!business && <span className="text-slate-500">No matching business</span>}
          {deal.productId && (
            <Link
              href={`/admin/deals/${deal._id}`}
              target="_blank"
              className="font-semibold text-brand-700 hover:underline"
            >
              View deal ↗
            </Link>
          )}
        </div>
      </td>
      <td className="py-3 pr-4">
        <input
          type="email"
          value={merchantEmail}
          onChange={(e) => setMerchantEmail(e.target.value)}
          placeholder="unassigned"
          className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
      </td>
      <td className="py-3 pr-4">
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          aria-label="End date"
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
        />
        {dealDisplayStatus(deal) === "Ended" && (
          <p className="mt-1 text-xs font-semibold text-slate-600">Ended — its run is over</p>
        )}
        <ScheduleControl deal={deal} onSaved={(item) => setDeal(item)} />
        {/* Not live yet: the run starts when it's approved. */}
        {!deal.expiresAt && Number(deal.requestedDurationMinutes) > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Runs {describeMinutes(Number(deal.requestedDurationMinutes))} once live
          </p>
        )}
      </td>
      <td className="py-3 pr-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(status === "Paused" || status === "Cancelled" || note) && (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              statusChangedToPausedOrCancelled ? "Note for the business (why?)" : "Note for the business"
            }
            className="mt-1 w-44 rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        )}
      </td>
      <td className="py-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
        {error && (
          // break-words: the note can carry a long email address, which
          // otherwise runs out past the card's edge.
          <p role="alert" className="mt-1 max-w-[9rem] break-words text-xs text-red-600">
            {error}
            {error.includes("sign in") && (
              <>
                {" "}
                <Link href="/admin/login" className="font-semibold underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        )}
      </td>
    </tr>
    {detailsOpen && (
      <tr className="border-b border-slate-100 bg-slate-50">
        <td colSpan={5} className="px-4 py-3 text-sm text-slate-600">
          {deal.priceNow !== undefined && (
            <p className="font-semibold text-slate-800">
              ${deal.priceNow}
              {deal.priceWas && deal.priceWas > deal.priceNow ? (
                <span className="ml-1 text-xs font-normal text-slate-500 line-through">
                  ${deal.priceWas}
                </span>
              ) : null}
              {deal.quantityAvailable ? (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  · {deal.quantityAvailable} available
                </span>
              ) : null}
            </p>
          )}
          {deal.description && <p className="mt-1">{deal.description}</p>}
          {deal.terms && <p className="mt-1 text-xs italic text-slate-500">Terms: {deal.terms}</p>}
          {deal.dealCode && (
            <p className="mt-1 text-xs text-slate-500">
              Code: <span className="font-mono font-semibold text-slate-700">{deal.dealCode}</span>
            </p>
          )}
          <div className="mt-1">
            <DealResults deal={deal} />
          </div>
          {!deal.productId && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              ⚠️ This deal has no page on the site yet — it won&apos;t appear on the storefront even if
              set to Live. Deals normally get one automatically when submitted; if it&apos;s
              missing here, have the business resubmit.
            </p>
          )}
          <RevisionReview deal={deal} onSaved={(item) => setDeal(item)} />
          <DealContentEditor
            deal={deal}
            onSaved={(item) => {
              setDeal(item);
              // An AI check can put the deal live; keep the status menu in step.
              if (item.status) setStatus(item.status);
            }}
          />
        </td>
      </tr>
    )}
    </>
  );
}

/**
 * A deal's requested or agreed start (lib/dealSchedule.ts), with a way to
 * set a new one — e.g. when the start passed before the deal was
 * reviewed, which blocks approval until it's moved — or to have it start
 * on approval instead. Saved on its own, straight away.
 */
function ScheduleControl({ deal, onSaved }: { deal: AdminDeal; onSaved: (item: AdminDeal) => void }) {
  const scheduledFuture = isScheduledFuture(deal);
  const waiting = !deal.firstPublishedAt && !deal.everLive;
  const missed = missedScheduledStart(deal);
  const [open, setOpen] = useState(false);
  const initial = deal.scheduledStartAt ? nzDateTimeParts(Date.parse(deal.scheduledStartAt)) : { date: "", time: "" };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deal.scheduledStartAt || !(scheduledFuture || waiting)) return null;

  async function send(scheduledStart: { date: string; time: string } | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${deal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledStart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't change the start time.");
      if (data.item) onSaved(data.item);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Couldn't change the start time.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 text-xs">
      <p className={missed ? "font-semibold text-red-600" : "font-semibold text-sky-800"}>
        {missed
          ? "Start time passed — set a new one to approve"
          : `${startLabel(scheduledFuture ? deal.firstPublishedAt : deal.scheduledStartAt)}${waiting ? " if approved" : ""}`}
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="font-semibold text-brand-700 hover:underline">
          Change start
        </button>
      ) : (
        <div className="mt-1 space-y-1">
          <div className="flex gap-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="New start date (NZ)" className="rounded border border-slate-200 px-1 py-0.5" />
            <input type="time" value={time} step={900} onChange={(e) => setTime(e.target.value)} aria-label="New start time (NZ)" className="rounded border border-slate-200 px-1 py-0.5" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !date || !time} onClick={() => send({ date, time })} className="rounded-full bg-brand-600 px-2.5 py-0.5 font-bold text-white disabled:opacity-40">
              Set start
            </button>
            <button type="button" disabled={busy} onClick={() => send(null)} className="font-semibold text-slate-600 hover:underline">
              Start on approval instead
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 max-w-[12rem] text-red-600">{error}</p>}
    </div>
  );
}

/**
 * A business's change request (lib/dealRevision.ts): what it asked for,
 * against the deal as it is now. Approve applies it like an admin edit;
 * Decline clears it, with an optional note the business sees.
 */
function RevisionReview({ deal, onSaved }: { deal: AdminDeal; onSaved: (item: AdminDeal) => void }) {
  const revision = readRevision(deal);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!revision) return null;

  async function decide(revisionDecision: "approve" | "decline") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deals/${deal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionDecision, revisionNote: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the decision.");
      if (data.item) onSaved(data.item);
    } catch (err: any) {
      setError(err?.message || "Couldn't save the decision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-bold">Change requested by the business</p>
      <ul className="mt-1 space-y-1">
        {revisionLines(revision, deal).map((l) => (
          <li key={l.label} className="break-words">
            <span className="font-semibold">{l.label}:</span> <span className="text-slate-600 line-through">{l.from}</span> → {l.to}
          </li>
        ))}
      </ul>
      {revision.note && <p className="mt-1 italic">&ldquo;{revision.note}&rdquo;</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => decide("approve")} className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">
          Approve change
        </button>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Note if declining (the business sees it)"
          aria-label="Note for the business if declining"
          className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs"
        />
        <button type="button" disabled={busy} onClick={() => decide("decline")} className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50">
          Decline
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
