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
    const interval = setInterval(() => setParts(getParts(target)), 60_000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
      ⏱ Ends in {parts.days > 0 ? `${parts.days}d ` : ""}
      {parts.hours}h
    </span>
  );
}
