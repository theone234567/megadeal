"use client";

import { useEffect, useState } from "react";

function getParts(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { days, hours, minutes };
}

export default function CountdownBadge({ target }: { target: Date }) {
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    // Under an hour left is exactly when minutes matter most, so refresh
    // every 15s in that window instead of only once a minute.
    const tick = () => setParts(getParts(target));
    const msLeft = target.getTime() - Date.now();
    const interval = setInterval(tick, msLeft < 60 * 60 * 1000 ? 15_000 : 60_000);
    return () => clearInterval(interval);
  }, [target]);

  const label =
    parts.days > 0
      ? `${parts.days}d ${parts.hours}h`
      : parts.hours > 0
      ? `${parts.hours}h ${parts.minutes}m`
      : `${parts.minutes}m`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
      ⏱ Ends in {label}
    </span>
  );
}
