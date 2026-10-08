/**
 * A random password the running site makes for itself, so its own
 * scheduled jobs (worker.mjs > lib/scheduledJobs.ts) can call its
 * /api/cron routes without CRON_SECRET having to be set by hand.
 *
 * Made once per running copy of the Worker and kept only in its memory
 * (on globalThis, which the Worker's entry and the site's bundled code
 * share; each has its own copy of this module). The scheduled job hands it
 * to the site in-process, never over the network, so no one outside can
 * learn it. CRON_SECRET still works, for calling a job from outside.
 *
 * No "server-only" import: worker.mjs loads this outside Next.
 */

const KEY = Symbol.for("megadeal.internalCallToken");

type Holder = { [KEY]?: string };

/** This running copy's password, made on first use. */
export function internalCallToken(): string {
  const g = globalThis as Holder;
  if (!g[KEY]) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    g[KEY] = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return g[KEY];
}

/** The password if one has been made here, without making one. */
export function existingInternalCallToken(): string | null {
  return (globalThis as Holder)[KEY] ?? null;
}
