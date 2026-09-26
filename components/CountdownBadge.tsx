"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; ended: boolean };

function getParts(target: Date): Parts {
  const raw = target.getTime() - Date.now();
  const diff = Math.max(0, raw);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes, ended: raw <= 0 };
}

export default function CountdownBadge({
  target,
  durationMs,
  variant = "badge",
}: {
  /** Absolute deadline — for real deals with a known expiry. */
  target?: Date;
  /** Deadline measured from when the badge mounts, for the sample/mockup
   *  card. A mockup must not anchor to an absolute instant: on a
   *  statically prerendered page that instant is the build time, so the
   *  fake deal visibly "expires" as the deployment ages. */
  durationMs?: number;
  /** "offer": the deal-card/deal-page treatment — an opaque white pill
   *  reading "Offer ends in …" (the deadline to get the offer, not a
   *  booking or usage deadline), no colour escalation or pulsing, and an
   *  explicit "Offer ended" once it reaches zero. "badge" is the original
   *  dark pill still used by SampleDealCard. */
  variant?: "badge" | "offer";
}) {
  // Deliberately null on the server and on the first client render.
  //
  // This used to be `useState(() => getParts(target))`, which reads
  // Date.now() *during render*. Pages like /list-your-business are
  // statically prerendered at BUILD time, so the HTML shipped a countdown
  // frozen at the moment of the build while the browser computed a live
  // one. The two never matched, and React threw hydration errors #418
  // ("initial UI does not match") and #425 ("text content does not
  // match") on every visit — drifting further apart the longer it had
  // been since the last deploy. Nothing time-dependent may be computed
  // before mount.
  const [parts, setParts] = useState<Parts | null>(null);

  // Keyed on the timestamp rather than the Date object: every caller
  // builds `new Date(...)` inline during render, so depending on object
  // identity would re-run this effect on every single render.
  const targetTime = target ? target.getTime() : null;

  useEffect(() => {
    const deadline =
      targetTime !== null ? new Date(targetTime) : new Date(Date.now() + (durationMs ?? 0));

    // A self-rescheduling timeout rather than setInterval, so the cadence
    // actually reacts as time passes rather than being fixed forever at
    // whatever it was when the badge first mounted. A badge opened 3 hours
    // before expiry used to stay on 60s ticks even after crossing into its
    // final hour — the fine-grained window the comment below exists for —
    // because setInterval's period is set once and never revisited.
    let timeoutId: ReturnType<typeof setTimeout>;
    function tick() {
      setParts(getParts(deadline));
      const msLeft = deadline.getTime() - Date.now();
      if (msLeft <= 0) return; // Reached zero — nothing left to count down.
      // Under an hour left is exactly when minutes matter most, so refresh
      // every 15s in that window instead of only once a minute.
      timeoutId = setTimeout(tick, msLeft < 60 * 60 * 1000 ? 15_000 : 60_000);
    }
    tick();
    return () => clearTimeout(timeoutId);
  }, [targetTime, durationMs]);

  const baseClass =
    variant === "offer"
      ? "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-800 shadow-sm"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-colors";
  const prefix = variant === "offer" ? "Offer ends in" : "Ends in";

  // Pre-mount placeholder: same box, same text metrics, invisible — so the
  // real badge swaps in without shifting anything around it, and screen
  // readers never announce a placeholder time.
  if (!parts) {
    return (
      <span className={`${baseClass} ${variant === "offer" ? "" : "bg-slate-900/80"} opacity-0`} aria-hidden="true">
        ⏱ {prefix} 00h 00m
      </span>
    );
  }

  if (variant === "offer") {
    if (parts.ended) {
      return <span className={`${baseClass} !bg-slate-100 !text-slate-600`}>Offer ended</span>;
    }
  }

  const label =
    parts.days > 0
      ? `${parts.days}d ${parts.hours}h`
      : parts.hours > 0
      ? `${parts.hours}h ${parts.minutes}m`
      : parts.minutes > 0
      ? `${parts.minutes}m`
      : "<1m";

  // Urgency escalates the badge color as the deal gets closer to expiring —
  // neutral with days left, amber under a day, pulsing red under an hour.
  const urgencyClass =
    parts.days > 0
      ? "bg-slate-900/80"
      : parts.hours > 0
      ? "bg-amber-600/90"
      : "animate-pulse bg-red-600/90";

  if (variant === "offer") {
    return <span className={baseClass}>⏱ {prefix} {label}</span>;
  }
  return <span className={`${baseClass} ${urgencyClass}`}>⏱ {prefix} {label}</span>;
}
