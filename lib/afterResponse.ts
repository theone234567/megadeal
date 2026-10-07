import { after } from "next/server";

/**
 * Runs `task` once the reply has been sent, and keeps the Worker alive
 * until it's done (Next's after(), which OpenNext hands to Cloudflare's
 * waitUntil). A promise started and not waited for is cut off when the
 * Worker finishes: that's how contact-form notifications went missing.
 *
 * Outside a request (route tests call handlers directly) it just starts
 * the task, as the code did before.
 */
export function afterResponse(task: () => Promise<unknown>): void {
  try {
    after(task);
  } catch {
    void task().catch((err) => console.error("[afterResponse] task failed", err));
  }
}
