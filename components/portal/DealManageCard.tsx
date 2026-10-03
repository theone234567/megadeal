"use client";

import { useState } from "react";
import Link from "next/link";
import type { DealStatus } from "@/lib/types";
import { DEAL_STATUS_STYLES, allowedDealActions, dealDisplayStatus, withdrawalRefundsCredit } from "@/lib/dealStatus";
import { describeMinutes } from "@/lib/dealDuration";
import { creditsLabel, creditsToRefund } from "@/lib/platformSettingsRules";
import PhotoUploadField from "./PhotoUploadField";

export interface DealRecord {
  _id: string;
  dealName?: string;
  productId?: string;
  expiresAt?: string;
  /** The run the business asked for; the clock starts when it first goes live. */
  requestedDurationMinutes?: number;
  status?: DealStatus | null;
  photoUrl?: string | null;
  merchantEmail?: string;
  statusNote?: string | null;
  dealCode?: string | null;
  [key: string]: any;
}

interface DealManageCardProps {
  deal: DealRecord;
  onChangeStatus: (deal: DealRecord, target: DealStatus) => Promise<void>;
  onChangePhoto: (deal: DealRecord, dataUrl: string) => Promise<void>;
  /** Before launch an approved deal isn't visible to anyone yet. */
  siteLaunched?: boolean;
}

export default function DealManageCard({
  deal,
  onChangeStatus,
  onChangePhoto,
  siteLaunched = true,
}: DealManageCardProps) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState<DealStatus | null>(null);

  // "Ended" once the run is over, whatever the stored status says.
  const status = dealDisplayStatus(deal);
  const actions = allowedDealActions(status);
  const isCancelled = status === "Cancelled";
  const isEnded = status === "Ended";
  const isPast = isCancelled || isEnded;
  const daysUntilExpiry = deal.expiresAt
    ? (new Date(deal.expiresAt).getTime() - Date.now()) / 86_400_000
    : null;
  const endingSoon = status === "Live" && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 3;

  // What withdrawing this deal gives back: what it was charged.
  const refundAmount = creditsToRefund(deal);
  const refundText = `the ${creditsLabel(refundAmount)} it used`;

  async function handleStatusClick(target: DealStatus) {
    if (target === "Cancelled") {
      const question = withdrawalRefundsCredit(deal)
        ? `Withdraw "${deal.dealName || "this deal"}"?${
            refundAmount > 0 ? ` You'll get back ${refundText}.` : ""
          } This can't be undone.`
        : `Cancel "${deal.dealName || "this deal"}"? It comes off MegaDeal straight away and can't be restarted — you can duplicate it later as a new deal.`;
      if (!window.confirm(question)) return;
    }
    setActionError(null);
    setBusyTarget(target);
    try {
      await onChangeStatus(deal, target);
    } catch (err: any) {
      setActionError(err?.message || "Couldn't update this deal. Please try again.");
    } finally {
      setBusyTarget(null);
    }
  }

  return (
    <li className="rounded-xl border border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-800">{deal.dealName || "Untitled deal"}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DEAL_STATUS_STYLES[status]}`}
          >
            {status === "Live" && !siteLaunched ? "Approved — shows at launch" : status}
          </span>
          <span className={`text-sm ${endingSoon ? "font-semibold text-ember-600" : "text-slate-500"}`}>
            {deal.expiresAt
              ? `${isEnded ? "Ended" : "Ends"} ${new Date(deal.expiresAt).toLocaleDateString()}`
              : Number(deal.requestedDurationMinutes) > 0
              ? `Runs ${describeMinutes(Number(deal.requestedDurationMinutes))} once approved`
              : "—"}
            {endingSoon && " ⏰"}
          </span>
          <span className="text-slate-500">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {(deal.description || deal.terms || deal.priceNow) && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              {deal.priceNow !== undefined && (
                <p className="font-semibold text-slate-800">
                  ${deal.priceNow}
                  {deal.priceWas && deal.priceWas > deal.priceNow ? (
                    <span className="ml-1 text-xs font-normal text-slate-500 line-through">
                      ${deal.priceWas}
                    </span>
                  ) : null}
                  {deal.quantityAvailable === 0 ? (
                    <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
                      Sold out
                    </span>
                  ) : deal.quantityAvailable !== undefined &&
                    deal.quantityAvailable !== null &&
                    deal.quantityAvailable <= 5 ? (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                      Only {deal.quantityAvailable} left
                    </span>
                  ) : deal.quantityAvailable ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      · {deal.quantityAvailable} available
                    </span>
                  ) : null}
                </p>
              )}
              {deal.description && <p className="mt-1">{deal.description}</p>}
              {deal.terms && (
                <p className="mt-1 text-xs italic text-slate-500">{deal.terms}</p>
              )}
              {deal.dealCode && (
                <p className="mt-2 text-xs text-slate-500">
                  Customers will quote{" "}
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-700 shadow-sm">
                    {deal.dealCode}
                  </span>{" "}
                  when they contact you about this deal.
                </p>
              )}
            </div>
          )}

          {deal.statusNote && (status === "Paused" || status === "Cancelled") && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span className="font-semibold">Note from MegaDeal:</span> {deal.statusNote}
            </p>
          )}

          {(deal.viewCount || deal.clickCount) && (
            <p className="text-xs text-slate-500">
              👁 {deal.viewCount || 0} view{deal.viewCount === 1 ? "" : "s"} · 🖱{" "}
              {deal.clickCount || 0} click{deal.clickCount === 1 ? "" : "s"} on &quot;Get this
              deal&quot;
            </p>
          )}

          <PhotoUploadField
            label="Deal photo"
            filenameLabel={deal.dealName}
            currentUrl={deal.photoUrl || null}
            disabled={isPast}
            disabledText={`This deal has ${isEnded ? "ended" : "been cancelled"}, so its photo can't be changed.`}
            warningText={
              status === "Pending Approval"
                ? "This replaces the photo we'll review with your deal. Continue?"
                : "Your new photo goes to MegaDeal for a quick check. Your current photo stays up until it's approved. Continue?"
            }
            onConfirm={(dataUrl) => onChangePhoto(deal, dataUrl)}
          />
          {deal.pendingPhotoUrl && !isPast && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deal.pendingPhotoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              <p className="text-sm text-brand-800">
                New photo waiting for approval. Your current photo stays up until then.
              </p>
            </div>
          )}

          {/* Everything else about a submitted deal is fixed: customers may
              already have a code for it, and the offer they saw has to be
              the offer they get. */}
          {!isPast && (
            <p className="text-sm text-slate-600">
              The offer itself can&apos;t be edited once submitted, so customers always get what they saw.
              Spotted a mistake?{" "}
              <Link
                href={`/contact?change=${encodeURIComponent(deal._id)}`}
                className="font-semibold text-brand-700 underline underline-offset-2"
              >
                Request a change
              </Link>
              {status === "Pending Approval"
                ? `, or withdraw it${
                    withdrawalRefundsCredit(deal) && refundAmount > 0 ? ` (you get back ${refundText})` : ""
                  } and submit a corrected one.`
                : ", or cancel it and duplicate it as a new deal."}
            </p>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            {actions.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">
                {isEnded
                  ? "This deal has ended. To offer it again, run it again as a new deal — you'll choose a new run length, and it starts when we approve it."
                  : isCancelled
                  ? "This deal is cancelled. To offer it again, run it again as a new deal."
                  : "Waiting for site owner approval — you'll be notified once it's reviewed."}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.target}
                    type="button"
                    onClick={() => handleStatusClick(action.target)}
                    disabled={busyTarget !== null}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-60 ${
                      action.danger
                        ? "border border-red-200 text-red-600 hover:bg-red-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {busyTarget === action.target ? "Saving…" : action.label}
                  </button>
                ))}
              </div>
            )}
            {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
          </div>

          {/* Finished deals get it as the main action: it's the one thing
              left to do with them. Copies the offer, never the old dates. */}
          <Link
            href={`/portal/new-deal?duplicate=${deal._id}`}
            className={
              isPast
                ? "inline-flex rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
                : "inline-block text-xs font-semibold text-brand-600 hover:underline"
            }
          >
            {isPast ? "Run this deal again →" : "Duplicate this deal →"}
          </Link>
        </div>
      )}
    </li>
  );
}
