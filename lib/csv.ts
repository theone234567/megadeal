/**
 * One CSV cell, safe to open in a spreadsheet (security audit of 10 Oct
 * 2026, finding 4). Text that a spreadsheet would read as a formula, one
 * starting with = + - @ or a tab or carriage return, gets a leading
 * apostrophe so it shows as text. Then the usual CSV quoting. Numbers
 * stay numbers.
 */
export function csvCell(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let str = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
