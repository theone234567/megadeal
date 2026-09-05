/** True for an empty string (optional field) or exactly 13 digits — the
 * New Zealand Business Number's format. Doesn't verify the number is a real,
 * registered NZBN (that needs a live lookup against the NZBN register),
 * just that what was typed could plausibly be one. */
export function isValidNzbnFormat(value: string): boolean {
  if (!value) return true;
  return /^\d{13}$/.test(value);
}
