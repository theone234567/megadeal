"use client";

import { useState } from "react";
import { missedScheduledStart, startLabel } from "@/lib/dealSchedule";
import Link from "next/link";
import type { DealStatus } from "@/lib/types";
import { DEAL_STATUS_STYLES, allowedDealActions, dealDisplayStatus, withdrawalRefundsCredit } from "@/lib/dealStatus";
import { describeMinutes } from "@/lib/dealDuration";
import { creditsLabel, creditsToRefund } from "@/lib/platformSettingsRules";
import PhotoUploadField from "./PhotoUploadField";
import DealChangeRequest from "./DealChangeRequest";
import DealResults from "@/components/DealResults";
import DealConditions from "@/components/DealConditions";

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
  /** Who paused it: only the business's own pause can be lifted here. */
  pausedBy?: "business" | "admin" | null;
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
  // A deal MegaDeal paused is restarted by MegaDeal (the status route
  // refuses it too), so it offers no "Make live".
  const actions = allowedDealActions(status).filter((a) => !(deal.pausedBy === "admin" && a.target === "Live"));
  const isCancelled = status === "Cancelled";
  const isEnded = status === "Ended";
  const isPast = isCancelled || isEnded;
  const daysUntilExpiry = deal.expiresAt
    ? (new Date(deal.expiresAt).getTime() - Date.now()) / 86_400_000
    : null;
  const endingSoon = status === "Live" && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
  // Waiting for approval past its requested start (lib/dealSchedule.ts).
  const missedStart = missedScheduledStart(deal);

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
        <span className="font-medium text-slate-800">
          {deal.dealName || "Untitled deal"}
          {deal.isFlash && (
            <span className="ml-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 align-middle text-[11px] font-bold text-sky-800">
              ⚡ Flash
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DEAL_STATUS_STYLES[status]}`}
          >
            {status === "Live" && !siteLaunched ? "Approved — shows at launch" : status}
          </span>
          <span className={`text-sm ${endingSoon || missedStart ? "font-semibold text-ember-600" : "text-slate-500"}`}>
            {status === "Scheduled"
              ? startLabel(deal.firstPublishedAt)
              : missedStart
              ? "Start time passed — needs a new time"
              : status === "Pending Approval" && deal.scheduledStartAt
              ? `${startLabel(deal.scheduledStartAt)} if approved`
              : deal.expiresAt
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
                  ) : deal.quantityAvailable ? (
                    // The number the business set; nothing counts it down
                    // (customers book and pay the business directly), so
                    // it isn't shown as stock left.
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      · {deal.quantityAvailable} offered
                    </span>
                  ) : null}
                </p>
              )}
              {deal.description && <p className="mt-1">{deal.description}</p>}
              {deal.terms && (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-semibold text-slate-700">Conditions</p>
                  <DealConditions terms={deal.terms} size="sm" className="text-slate-600" />
                </div>
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
          {status === "Paused" && deal.pausedBy === "admin" && (
            <p className="text-sm text-slate-600">MegaDeal paused this deal. <a href="/contact" className="font-semibold text-brand-700 underline">Contact us</a> to restart it.</p>
          )}

          <DealResults deal={deal} />

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

          {/* A submitted deal isn't edited in place: customers may already
              have a code for it. Changes are requested and only show once
              approved (lib/dealRevision.ts). */}
          {!isPast && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Spotted a mistake or need to change something? Request a change: customers keep seeing the
                deal as it is until we&apos;ve approved it.
                {status === "Pending Approval"
                  ? ` You can also withdraw it${
                      withdrawalRefundsCredit(deal) && refundAmount > 0 ? ` (you get back ${refundText})` : ""
                    } and submit a corrected one.`
                  : ""}
              </p>
              <DealChangeRequest deal={deal} />
            </div>
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
            {/* What Pause does, in the business's terms: the end date is
                fixed at first publication and pausing never moves it
                (lib/dealStatus.ts hasDealExpired). */}
            {(status === "Live" || status === "Scheduled") && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold">Pause</span> takes this deal off MegaDeal straight away, for
                example if you&apos;ve run out or are too busy. Choose &ldquo;Make live&rdquo; to bring it back
                any time before it ends. Pausing doesn&apos;t stop the clock: the end date stays the same.
              </p>
            )}
            {status === "Paused" && (
              <p className="mt-2 text-xs text-slate-600">
                Paused: customers can&apos;t see this deal on MegaDeal. Choose &ldquo;Make live&rdquo; to show it
                again
                {deal.expiresAt
                  ? ` before it ends on ${new Date(deal.expiresAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" })}`
                  : ""}
                .
                Pausing doesn&apos;t stop the clock.
              </p>
            )}
            {actionError &&<p role="alert" className="mt-2 text-sm text-red-600">{actionError}</p>}
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
