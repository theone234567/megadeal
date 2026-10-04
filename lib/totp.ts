import { createHmac, randomBytes } from "crypto";

/**
 * Time-based one-time codes (RFC 6238, the 6-digit codes from Google
 * Authenticator, 1Password, Authy…) for admin two-factor sign-in. SHA-1,
 * 30-second steps, 6 digits: what every authenticator app uses by default.
 */

const STEP_SECONDS = 30;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer | null {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  if (!clean || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret (160 bits), base32 as authenticator apps expect. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: Buffer, step: number, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", secret).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(binary).padStart(digits, "0");
}

/**
 * Checks a code against the current 30-second step and one either side
 * (a phone clock a little out). Returns the step it matched, so a caller
 * can refuse the same code twice, or null.
 */
export function verifyTotp(secretBase32: string, code: string, now: number = Date.now()): number | null {
  const secret = base32Decode(secretBase32);
  const clean = String(code ?? "").replace(/\s/g, "");
  if (!secret || secret.length < 10 || !/^\d{6}$/.test(clean)) return null;
  const step = Math.floor(now / 1000 / STEP_SECONDS);
  for (const s of [step - 1, step, step + 1]) {
    if (totpCode(secret, s) === clean) return s;
  }
  return null;
}

/** The otpauth:// link an authenticator app opens to add the account. */
export function totpUri(secretBase32: string, account = "admin", issuer = "MegaDeal"): string {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}
