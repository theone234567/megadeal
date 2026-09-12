"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number };

function getParts(target: Date): Parts {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

export default function CountdownBadge({
  target,
  durationMs,
}: {
  /** Absolute deadline — for real deals with a known expiry. */
  target?: Date;
  /** Deadline measured from when the badge mounts, for the sample/mockup
   *  card. A mockup must not anchor to an absolute instant: on a
   *  statically prerendered page that instant is the build time, so the
   *  fake deal visibly "expires" as the deployment ages. */
  durationMs?: number;
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

    const tick = () => setParts(getParts(deadline));
    tick();

    // Under an hour left is exactly when minutes matter most, so refresh
    // every 15s in that window instead of only once a minute.
    const msLeft = deadline.getTime() - Date.now();
    const interval = setInterval(tick, msLeft < 60 * 60 * 1000 ? 15_000 : 60_000);
    return () => clearInterval(interval);
  }, [targetTime, durationMs]);

  const baseClass =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-colors";

  // Pre-mount placeholder: same box, same text metrics, invisible — so the
  // real badge swaps in without shifting anything around it, and screen
  // readers never announce a placeholder time.
  if (!parts) {
    return (
      <span className={`${baseClass} bg-slate-900/80 opacity-0`} aria-hidden="true">
        ⏱ Ends in 00d 00h
      </span>
    );
  }

  const label =
    parts.days > 0
      ? `${parts.days}d ${parts.hours}h`
      : parts.hours > 0
      ? `${parts.hours}h ${parts.minutes}m`
      : `${parts.minutes}m`;

  // Urgency escalates the badge color as the deal gets closer to expiring —
  // neutral with days left, amber under a day, pulsing red under an hour.
  const urgencyClass =
    parts.days > 0
      ? "bg-slate-900/80"
      : parts.hours > 0
      ? "bg-amber-600/90"
      : "animate-pulse bg-red-600/90";

  return <span className={`${baseClass} ${urgencyClass}`}>⏱ Ends in {label}</span>;
}
