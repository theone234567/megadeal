/**
 * Phone numbers a business types (security pack T140): a real New Zealand
 * number, or an international one written with its country code, as E.164
 * ("+6491234567") for tel: links. Anything else ("abc", "12", a number
 * with letters in it) is refused, so a call button never dials junk.
 *
 * NZ numbers after the leading 0 (or +64):
 * - landlines: area code 3, 4, 6, 7 or 9, then 7 digits ("09 123 4567");
 * - mobiles: 2 then 7 to 9 digits ("021 123 456", "027 123 4567");
 * - freephone: 800 or 508 then 6 or 7 digits ("0800 123 456").
 */
const NZ_NATIONAL = /^(?:[34679]\d{7}|2\d{7,9}|(?:800|508)\d{6,7})$/;

export function phoneE164(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  // Only what people write numbers with: digits, spaces, + - . ( ).
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  const international = raw.startsWith("+") || digits.startsWith("00");
  if (international) {
    const full = digits.startsWith("00") ? digits.slice(2) : digits;
    if (full.startsWith("64")) {
      const national = full.slice(2).replace(/^0/, "");
      return NZ_NATIONAL.test(national) ? `+64${national}` : null;
    }
    // Another country: E.164 is at most 15 digits; at least 8 is a real number.
    return /^[1-9]\d{7,14}$/.test(full) ? `+${full}` : null;
  }
  if (!digits.startsWith("0")) return null;
  const national = digits.slice(1);
  return NZ_NATIONAL.test(national) ? `+64${national}` : null;
}
