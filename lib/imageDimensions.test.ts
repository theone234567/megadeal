import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { imageDimensions, imageSizeAcceptable } from "./imageDimensions";

const file = (p: string) => new Uint8Array(readFileSync(p));

/** A PNG header claiming the given size (enough for the reader). */
function pngHeader(w: number, h: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}

/** A JPEG with an APP0 segment then a baseline frame header. */
function jpegHeader(w: number, h: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ]);
}

describe("imageDimensions", () => {
  it("reads real WebP and PNG files from the site", () => {
    expect(imageDimensions(file("public/megadeal-coming-soon/auckland-hero-v1-640w.webp"))).toEqual({ width: 640, height: 427 });
    expect(imageDimensions(file("public/email-logo.png"))).toEqual({ width: 64, height: 64 });
  });

  it("reads JPEG and GIF headers", () => {
    expect(imageDimensions(jpegHeader(1200, 900))).toEqual({ width: 1200, height: 900 });
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00]);
    expect(imageDimensions(gif)).toEqual({ width: 320, height: 240 });
  });

  it("turns away an image claiming huge dimensions, or none it can read", () => {
    expect(imageSizeAcceptable(pngHeader(4000, 3000))).toBe(true);
    expect(imageSizeAcceptable(pngHeader(60_000, 60_000))).toBe(false);
    expect(imageSizeAcceptable(pngHeader(9_000, 9_000))).toBe(false); // 81 million pixels
    expect(imageSizeAcceptable(jpegHeader(0, 0))).toBe(false);
    expect(imageSizeAcceptable(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(false);
  });
});
