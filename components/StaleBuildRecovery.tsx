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
      if (isChunkError(event.error) || isChunkError(event.message)) recover();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) recover();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
