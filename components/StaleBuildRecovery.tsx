"use client";

import { useEffect } from "react";

/**
 * Recovers a page left stranded by a deploy.
 *
 * Next splits the app into content-hashed chunks and fetches them lazily.
 * When a deploy lands, the old filenames stop existing — so a tab that was
 * already open asks for a chunk that is gone, gets the HTML 404 page back,
 * and the browser refuses it:
 *
 *   Refused to execute script … MIME type ('text/html') is not executable
 *   ChunkLoadError: Loading chunk 9668 failed
 *
 * From then on that tab is quietly broken: navigation falls back or dies,
 * and forms fail in ways that look like application bugs. It cost hours of
 * misdiagnosis during the signup incident, and every one of those symptoms
 * would have hit a real business owner mid-signup just the same — they
 * simply would have left instead of reporting it.
 *
 * Since the site deploys on every push, this is routine rather than
 * exotic, so the page repairs itself: a chunk failure means the bundle
 * moved, and reloading fetches the current one.
 *
 * Guarded by sessionStorage so a genuinely broken build can't put the tab
 * in a reload loop — one attempt per session, then it stops and lets the
 * error surface honestly.
 */

const RELOAD_FLAG = "megadeal-chunk-reload";

function isChunkError(value: unknown): boolean {
  const message =
    value instanceof Error
      ? `${value.name}: ${value.message}`
      : typeof value === "string"
        ? value
        : "";
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    // The MIME refusal above: the 404 page came back instead of JS.
    /is not executable/i.test(message)
  );
}

export default function StaleBuildRecovery() {
  useEffect(() => {
    let done = false;

    const recover = () => {
      if (done) return;
      done = true;

      try {
        if (sessionStorage.getItem(RELOAD_FLAG)) {
          // Already tried this session. Reloading again would loop, so
          // leave the error visible rather than trapping the visitor.
          console.error("[stale-build] chunk error persists after reload");
          return;
        }
        sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        // Private mode or blocked storage: without a way to remember the
        // attempt, don't reload at all. A loop is far worse than an error.
        return;
      }

      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      // A <script> that 404s reports the failure on the element itself,
      // with no message and no Error — and that event does not bubble, so
      // it only reaches here in the capture phase. Listening without
      // capture (as this did) meant the most common symptom of a stale
      // build, the MIME refusal on a missing chunk, never arrived at all.
      const target = event.target as HTMLScriptElement | null;
      if (target && target !== (window as unknown as HTMLScriptElement)) {
        const src = typeof target.src === "string" ? target.src : "";
        if (src.includes("/_next/static/")) {
          recover();
          return;
        }
      }
      if (isChunkError(event.error) || isChunkError(event.message)) recover();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) recover();
    };

    // Capture, so element-level resource failures are seen.
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);

    // A page that has been up and working for a few seconds is proof the
    // bundle it loaded is intact, so the one-attempt guard is cleared for
    // the next deploy. Without this the guard is spent for the rest of the
    // session after a single recovery — and on a site that deploys on
    // every push, a second deploy in one sitting is routine, not exotic.
    const settled = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // Storage unavailable — nothing to clear.
      }
    }, 10_000);

    return () => {
      window.clearTimeout(settled);
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
