import "server-only";
import { getRateLimitKv } from "./rateLimit";

/**
 * The admin audit trail (handoff pack, FINAL-SPEC §9): what was done in
 * the admin dashboard and when — sign-ins (and failed ones), approvals and
 * edits, business status and credit changes, deletions, settings. Read at
 * /admin/audit.
 *
 * Kept in Workers KV as one list, newest first, the last 500 entries.
 * Never fatal: if writing fails, the action it describes still happens.
 * KV is eventually consistent, so two admin actions in the same instant
 * from two places could keep only one line; with one admin that's
 * practically never. Business-facing history (credit activity, deal
 * content history, settings history) is kept where it always was.
 */

const KEY = "admin-audit:v1";
const LIMIT = 500;

export interface AdminAuditEntry {
  at: string;
  /** "Deal approved", "Signed in", "Credits changed"… */
  action: string;
  /** What it was done to: a deal or business name, with its id. */
  target?: string;
  /** The specifics, in plain words. */
  detail?: string;
  ip?: string;
}

export async function readAdminAudit(): Promise<AdminAuditEntry[]> {
  try {
    const kv = await getRateLimitKv();
    const raw = kv ? await kv.get(KEY) : null;
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function logAdminAction(entry: Omit<AdminAuditEntry, "at">): Promise<void> {
  try {
    const kv = await getRateLimitKv();
    if (!kv) return;
    const list = await readAdminAudit();
    const line: AdminAuditEntry = {
      at: new Date().toISOString(),
      action: entry.action.slice(0, 120),
      ...(entry.target ? { target: entry.target.slice(0, 200) } : {}),
      ...(entry.detail ? { detail: entry.detail.slice(0, 600) } : {}),
      ...(entry.ip ? { ip: entry.ip.slice(0, 64) } : {}),
    };
    await kv.put(KEY, JSON.stringify([line, ...list].slice(0, LIMIT)));
  } catch (err) {
    console.error("[adminAudit] log failed", err);
  }
}

/** "Two coffees (d1a2…)" */
export function auditTarget(name: unknown, id: unknown): string {
  const n = typeof name === "string" && name.trim() ? name.trim() : "Untitled";
  const i = typeof id === "string" ? id.slice(0, 8) : "";
  return i ? `${n} (${i}…)` : n;
}
