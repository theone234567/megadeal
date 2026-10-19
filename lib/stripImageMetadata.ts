/**
 * Takes the camera details out of an uploaded photo before it's stored:
 * EXIF (where a phone records the GPS position the photo was taken at,
 * often a home for a home-based business), XMP, IPTC and comments. The
 * upload forms already redraw photos, which drops all of this; this covers
 * a photo sent to /api/upload-photo any other way (audit of 19 Oct 2026).
 *
 * Only metadata is removed: the picture, its colour profile and everything
 * a viewer needs are left as they are. Anything not laid out as expected
 * comes back unchanged rather than half-edited, as does GIF, which has no
 * camera metadata.
 */
export function stripImageMetadata(mimeType: string, bytes: Uint8Array): Uint8Array {
  try {
    if (mimeType === "image/jpeg") return stripJpeg(bytes);
    if (mimeType === "image/png") return stripPng(bytes);
    if (mimeType === "image/webp") return stripWebp(bytes);
  } catch {
    // A malformed file: stored as it came, as before.
  }
  return bytes;
}

/** APP1 (EXIF, XMP), APP13 (IPTC) and COM segments, up to the image data. */
function stripJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b;
    const marker = b[i + 1];
    // Start of scan: the compressed picture follows, to the end.
    if (marker === 0xda) {
      keep.push(b.subarray(i));
      return concat(keep);
    }
    // Markers with no length.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2 || i + 2 + length > b.length) return b;
    const metadata = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!metadata) keep.push(b.subarray(i, i + 2 + length));
    i += 2 + length;
  }
  return b;
}

const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array {
  if (b.length < 8) return b;
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const length = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const end = i + 12 + length;
    if (end > b.length) return b;
    if (!PNG_METADATA.has(type)) keep.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return concat(keep);
  }
  return b;
}

function stripWebp(b: Uint8Array): Uint8Array {
  const tag = (at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
  if (b.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return b;
  const keep: Uint8Array[] = [];
  let i = 12;
  let removed = false;
  while (i + 8 <= b.length) {
    const type = tag(i);
    const size = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + size + (size % 2);
    if (end > b.length) return b;
    if (type === "EXIF" || type === "XMP ") {
      removed = true;
    } else {
      const chunk = b.slice(i, end);
      // VP8X says which extra chunks follow: no longer EXIF or XMP.
      if (type === "VP8X" && size >= 1) chunk[8] &= ~(0x08 | 0x04);
      keep.push(chunk);
    }
    i = end;
  }
  if (!removed) return b;
  const body = concat(keep);
  const out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12));
  const riffSize = 4 + body.length;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >>> 8) & 0xff;
  out[6] = (riffSize >>> 16) & 0xff;
  out[7] = (riffSize >>> 24) & 0xff;
  out.set(body, 12);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
