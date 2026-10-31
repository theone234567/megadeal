import "server-only";
import { SIGNUP_MISSED_KEY } from "./kvMarkers";
import { getRateLimitKv } from "./rateLimit";

/**
 * Businesses that tried to sign up when their 6-digit code couldn't be
 * sent. Supabase then undoes the sign-up, so no account is left to find
 * them by: their address is kept here, for Admin > Needs attention, so the
 * admin can contact them. Only the admin pages show it (never an email).
 * Someone who signs up successfully later drops off the list, as does
 * anyone the admin marks done, and everyone after 30 days.
 */

export type MissedSignup = { email: string; at: string };

const KEEP_DAYS = 30;
const KEEP_MS = KEEP_DAYS * 24 * 60 * 60 * 1000;
/** Enough for any real outage; a flood of made-up addresses can't grow it. */
const MAX_KEPT = 50;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The list, newest first, without anything older than 30 days. */
export function currentMissed(list: MissedSignup[], now: number = Date.now()): MissedSignup[] {
  return list
    .filter((m) => typeof m?.email === "string" && typeof m?.at === "string" && now - new Date(m.at).getTime() <= KEEP_MS)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** The list with this address at the top (once), at most 50 long. */
export function withMissed(list: MissedSignup[], email: string, now: number = Date.now()): MissedSignup[] {
  const at = new Date(now).toISOString();
  return currentMissed([{ email: email.trim(), at }, ...list.filter((m) => !same(m.email, email))], now).slice(0, MAX_KEPT);
}

export function withoutMissed(list: MissedSignup[], email: string): MissedSignup[] {
  return list.filter((m) => !same(m.email, email));
}

async function read(): Promise<MissedSignup[]> {
  try {
    const raw = await (await getRateLimitKv())?.get(SIGNUP_MISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? currentMissed(parsed) : [];
  } catch {
    return [];
  }
}

async function write(list: MissedSignup[]): Promise<void> {
  const kv = await getRateLimitKv();
  if (!kv) return;
  if (list.length === 0) await kv.delete(SIGNUP_MISSED_KEY);
  else await kv.put(SIGNUP_MISSED_KEY, JSON.stringify(list), { expirationTtl: KEEP_DAYS * 24 * 60 * 60 });
}

/** A business whose sign-up code couldn't be sent. */
export async function noteMissedSignup(email: string): Promise<void> {
  try {
    await write(withMissed(await read(), email));
  } catch {
    // Noting a problem must never become one.
  }
}

/** Signed up after all, or the admin has been in touch. */
export async function forgetMissedSignup(email: string): Promise<void> {
  try {
    const list = await read();
    const next = withoutMissed(list, email);
    if (next.length !== list.length) await write(next);
  } catch {
    // As above.
  }
}

export const missedSignups = read;
