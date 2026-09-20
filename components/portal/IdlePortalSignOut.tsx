"use client";

import { useEffect, useRef, useState } from "react";
import { useWix } from "@/context/WixProvider";

// 10 minutes of no mouse/keyboard/touch/scroll activity signs a merchant
// out automatically — the portal shows real business data (credits,
// applications, deal performance), so an unattended signed-in tab
// shouldn't stay open indefinitely on a shared or public computer.
const IDLE_LIMIT_MS = 10 * 60 * 1000;
// Warned rather than cut off without notice: a silent sign-out mid-form
// (editing a deal, filling in the listing form) would cost unsaved work
// with no explanation. This gives a last chance to say "still here" —
// any activity at all, including the button below, cancels it.
const WARNING_LEAD_MS = 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export default function IdlePortalSignOut() {
  const { isLoggedIn, logout } = useWix();
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout>>();
  const signOutTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isLoggedIn) return;

    function clearTimers() {
      clearTimeout(warnTimer.current);
      clearTimeout(signOutTimer.current);
    }

    function scheduleTimers() {
      clearTimers();
      setShowWarning(false);
      warnTimer.current = setTimeout(() => setShowWarning(true), IDLE_LIMIT_MS - WARNING_LEAD_MS);
      signOutTimer.current = setTimeout(() => logout(), IDLE_LIMIT_MS);
    }

    scheduleTimers();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, scheduleTimers, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, scheduleTimers));
    };
  }, [isLoggedIn, logout]);

  if (!showWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Inactivity warning"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-card sm:inset-x-auto sm:right-4"
    >
      <p className="text-sm font-bold text-slate-900">Still there?</p>
      <p className="mt-1 text-sm text-slate-600">
        You&apos;ve been inactive for a while — for your security, you&apos;ll be signed out in
        under a minute.
      </p>
      {/* Any click already counts as activity and cancels the sign-out via
          the listener above; this button just makes that obvious instead
          of asking someone to click anywhere and trust it worked. */}
      <button
        onClick={() => setShowWarning(false)}
        className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
      >
        Stay signed in
      </button>
    </div>
  );
}
