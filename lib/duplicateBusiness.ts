import { normalizeNzbn } from "./nzbn";
import { phoneE164 } from "./phoneNumber";
import { queryAllItems } from "./queryAll";

/**
 * One business, one free allowance (T221). The only thing unique per
 * business is its sign-in email, so one person with several emails could
 * sign up the same business several times, each getting the welcome offer
 * and a referral bonus for "referring" itself. Here, another business with
 * the same NZBN, phone number or street address is a possible duplicate:
 * the admin page says so, and approving one waits for the admin to decide
 * whether its free credits are given (app/api/admin/merchants/[id]).
 * Nothing is refused outright: franchises and several sites under one
 * company are real, so a person decides.
 */

export type DuplicateMatch = {
  id: string;
  name: string;
  status: string;
  /** Plain words for the admin page: "same NZBN", "same phone number"… */
  reasons: string[];
};

// Street words written either way ("12 Queen Street" / "12 Queen St").
const STREET_WORDS: Record<string, string> = {
  street: "st", road: "rd", avenue: "ave", av: "ave", drive: "dr", place: "pl", lane: "ln",
  terrace: "tce", crescent: "cres", court: "ct", highway: "hwy", parade: "pde", boulevard: "blvd",
  square: "sq", close: "cl", grove: "gr", way: "way", quay: "qy", mount: "mt", saint: "st",
};

/**
 * A street address and city as one comparable key: lower case, no
 * punctuation, street words shortened, "Level 2" and "Unit" style words
 * kept (a different unit in the same building is a different business).
 * Null when there's too little to compare.
 */
export function addressKey(address: unknown, city: unknown): string | null {
  const words = `${typeof address === "string" ? address : ""} ${typeof city === "string" ? city : ""}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => STREET_WORDS[w] ?? w);
  // A number and a street name at least: "Auckland" alone matches everyone.
  if (!words.some((w) => /\d/.test(w)) || words.length < 3) return null;
  return words.join(" ");
}

type Signals = { nzbn: string | null; phones: Set<string>; address: string | null };

function signalsOf(m: Record<string, any>): Signals {
  const nzbn = normalizeNzbn(m.nzbn);
  const phones = new Set<string>();
  for (const p of [m.phone, m.contactPhone]) {
    const e164 = phoneE164(typeof p === "string" ? p : "");
    if (e164) phones.add(e164);
  }
  return { nzbn: /^\d{13}$/.test(nzbn) ? nzbn : null, phones, address: addressKey(m.address, m.city) };
}

/**
 * The businesses in `others` that look like `target`: same NZBN, a phone
 * number in common (business or contact phone) or the same street
 * address. Test businesses are left out on both sides, and a referral
 * from a matching business is named as such (self-referral).
 */
export function findDuplicates(target: Record<string, any>, others: Record<string, any>[]): DuplicateMatch[] {
  if (target.isTest) return [];
  const mine = signalsOf(target);
  const referredBy = String(target.referredByCode ?? "").trim().toUpperCase();
  const matches: DuplicateMatch[] = [];
  for (const other of others) {
    if (!other || other._id === target._id || other.isTest) continue;
    const theirs = signalsOf(other);
    const reasons: string[] = [];
    if (mine.nzbn && mine.nzbn === theirs.nzbn) reasons.push("same NZBN");
    if ([...mine.phones].some((p) => theirs.phones.has(p))) reasons.push("same phone number");
    if (mine.address && mine.address === theirs.address) reasons.push("same address");
    if (reasons.length === 0) continue;
    if (referredBy && String(other.referralCode ?? "").toUpperCase() === referredBy) reasons.push("signed up with its referral code");
    matches.push({
      id: String(other._id),
      name: String(other.businessName || other.email || "A business"),
      status: String(other.status || "Pending"),
      reasons,
    });
  }
  return matches;
}

/** findDuplicates against every other business on MegaDeal. */
export async function possibleDuplicates(client: any, target: Record<string, any>): Promise<DuplicateMatch[]> {
  if (target.isTest) return [];
  const all = await queryAllItems(() => client.items.query("Merchants"), "duplicate check");
  return findDuplicates(target, all);
}

/** "Kai Cafe (same phone number, same address)" for messages and the audit log. */
export function describeDuplicates(matches: DuplicateMatch[]): string {
  return matches.map((m) => `${m.name} (${m.reasons.join(", ")})`).join("; ");
}
