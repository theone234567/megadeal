"use client";

import { useEffect, useState } from "react";
import { openStatus, parseBusinessHours } from "@/lib/businessHours";

/**
 * "Open now until 4pm" / "Closed, opens 7am" on the business page (T256).
 * The page is cached, so the label it was built with can be out of date by
 * the time someone reads it: this starts from that label (shown without
 * JavaScript too) and works it out again in the browser, then each minute.
 */
export default function OpenNowLabel({ hours, initial }: { hours: string; initial: { open: boolean; label: string } }) {
  const [status, setStatus] = useState(initial);
  useEffect(() => {
    const data = parseBusinessHours(hours);
    if (!data) return;
    const update = () => {
      const next = openStatus(data);
      if (next) setStatus(next);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [hours]);
  return <p className={`text-sm font-semibold ${status.open ? "text-emerald-800" : "text-slate-600"}`}>{status.label}</p>;
}
