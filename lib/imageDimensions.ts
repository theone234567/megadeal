/**
 * An image's width and height read from its header, without decoding it:
 * JPEG, PNG, GIF and WebP. null when the header can't be read. Used to
 * turn away images whose pixel size is far beyond any photo (a small file
 * that unpacks into a huge image can exhaust the resizer).
 */
export function imageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const u16be = (i: number) => (bytes[i] << 8) | bytes[i + 1];
  const u16le = (i: number) => bytes[i] | (bytes[i + 1] << 8);
  const u24le = (i: number) => bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
  const u32be = (i: number) => ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
  const len = bytes.length;

  // PNG: IHDR straight after the signature.
  if (len >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[12] === 0x49 && bytes[13] === 0x48) {
    return { width: u32be(16), height: u32be(20) };
  }
  // GIF: the logical screen size.
  if (len >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: u16le(6), height: u16le(8) };
  }
  // WebP: lossy (VP8 ), lossless (VP8L) or extended (VP8X).
  if (len >= 30 && bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8 ") return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = (i: number) => bytes[21 + i];
      return { width: 1 + (((b(1) & 0x3f) << 8) | b(0)), height: 1 + (((b(3) & 0x0f) << 10) | (b(2) << 2) | ((b(1) & 0xc0) >> 6)) };
    }
    if (chunk === "VP8X") return { width: 1 + u24le(24), height: 1 + u24le(27) };
    return null;
  }
  // JPEG: walk the segments to the frame header (SOF0–SOF15, not DHT/JPG/DAC).
  if (len >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < len) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(i + 7), height: u16be(i + 5) };
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        i += 2;
        continue;
      }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  return null;
}

/** Larger than any phone or camera photo needs; the site shows them at 1200px. */
export const MAX_IMAGE_SIDE = 10_000;
export const MAX_IMAGE_PIXELS = 50_000_000;

/** True when an image's size is readable and within the limits above. */
export function imageSizeAcceptable(bytes: Uint8Array): boolean {
  const d = imageDimensions(bytes);
  return Boolean(d && d.width >= 1 && d.height >= 1 && d.width <= MAX_IMAGE_SIDE && d.height <= MAX_IMAGE_SIDE && d.width * d.height <= MAX_IMAGE_PIXELS);
}
