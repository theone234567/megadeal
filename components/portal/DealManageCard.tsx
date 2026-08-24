"use client";

import { useState } from "react";
import type { DealStatus } from "@/lib/types";
import { DEAL_STATUS_STYLES, allowedDealActions } from "@/lib/dealStatus";
import PhotoUploadField from "./PhotoUploadField";

export interface DealRecord {
  _id: string;
  dealName?: string;
  productId?: string;
  expiresAt?: string;
  status?: DealStatus | null;
  photoUrl?: string | null;
  merchantEmail?: string;
  [key: string]: any;
}

interface DealManageCardProps {
  deal: DealRecord;
  onChangeStatus: (deal: DealRecord, target: DealStatus) => Promise<void>;
  onChangePhoto: (deal: DealRecord, dataUrl: string) => Promise<void>;
}

export default function DealManageCard({ deal, onChangeStatus, onChangePhoto }: DealManageCardProps) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState<DealStatus | null>(null);

  const status: DealStatus | null = deal.status ?? "Live";
  const actions = allowedDealActions(status);
  const isCancelled = status === "Cancelled";

  async function handleStatusClick(target: DealStatus) {
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
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-800">{deal.dealName || "Untitled deal"}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DEAL_STATUS_STYLES[status]}`}
          >
            {status}
          </span>
          <span className="text-sm text-slate-500">
            {deal.expiresAt ? `Ends ${new Date(deal.expiresAt).toLocaleDateString()}` : "—"}
          </span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
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
                    <span className="ml-1 text-xs font-normal text-slate-400 line-through">
                      ${deal.priceWas}
                    </span>
                  ) : null}
                  {deal.quantityAvailable ? (
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      · {deal.quantityAvailable} available
                    </span>
                  ) : null}
                </p>
              )}
              {deal.description && <p className="mt-1">{deal.description}</p>}
              {deal.terms && (
                <p className="mt-1 text-xs italic text-slate-500">{deal.terms}</p>
              )}
            </div>
          )}

          <PhotoUploadField
            label="Deal photo"
            currentUrl={deal.photoUrl || null}
            disabled={isCancelled}
            disabledText="This deal is cancelled, so its photo can't be changed."
            warningText="Changing the photo sends this deal back for approval — it won't show as live on the site until we've reviewed it. Continue?"
            onConfirm={(dataUrl) => onChangePhoto(deal, dataUrl)}
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
            {actions.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">
                {isCancelled
                  ? "This deal is cancelled. Contact us if you'd like to relist it."
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
        </div>
      )}
    </li>
  );
}
