/** True for an empty string (optional field) or exactly 13 digits — the
 * New Zealand Business Number's format. Doesn't verify the number is a real,
 * registered NZBN (that needs a live lookup against the NZBN register),
 * just that what was typed could plausibly be one. */
export function isValidNzbnFormat(value: string): boolean {
  if (!value) return true;
  return /^\d{13}$/.test(value);
}

/** Strips everything but digits (people often paste an NZBN grouped with
 * spaces or dashes, e.g. "9429 041 234 567") before capping at 13 chars —
 * a raw slice(0, 13) on the untouched input would cut into the digits
 * themselves and turn a valid NZBN into one that fails isValidNzbnFormat. */
export function normalizeNzbn(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^0-9]/g, "").slice(0, 13);
}
