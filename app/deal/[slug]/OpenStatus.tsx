"use client";

import { useEffect, useState } from "react";
import { openStatus, parseBusinessHours } from "@/lib/businessHours";

/**
 * "Open now · closes 9:30pm" beside the business's name, from its opening
 * hours in New Zealand time. Worked out in the browser after the page
 * loads, so a cached page never shows yesterday's answer, and refreshed
 * each minute while it's open. Nothing when no hours were given.
 */
export default function OpenStatus({ hours }: { hours: string | null }) {
  const [status, setStatus] = useState<ReturnType<typeof openStatus>>(null);
  useEffect(() => {
    const data = parseBusinessHours(hours);
    if (!data) return;
    const update = () => setStatus(openStatus(data));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [hours]);
  if (!status) return null;
  const [state, when] = status.label.split(" · ");
  return (
    <>
      <span aria-hidden="true"> · </span>
      <span className="whitespace-nowrap">
        <span className={`font-semibold ${status.open ? "text-emerald-700" : "text-slate-700"}`}>{state}</span>
        {when && <span> · {when}</span>}
      </span>
    </>
  );
}
