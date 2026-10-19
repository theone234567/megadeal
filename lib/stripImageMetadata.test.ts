import { describe, expect, it } from "vitest";
import { stripImageMetadata } from "./stripImageMetadata";

// 16x12 images saved with a phone's kind of metadata: camera "HomeCam" and
// a GPS position (36°51'S 174°46'E), plus a text comment in the PNG.
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/4QCcRXhpZgAATU0AKgAAAAgAAgEPAAIAAAAIAAAAJoglAAQAAAABAAAALgAAAABIb21lQ2FtAAAEAAEAAgAAAAJTAAAAAAIABQAAAAMAAABkAAMAAgAAAAJFAAAAAAQABQAAAAMAAAB8AAAAAAAAACQAAAABAAAAMwAAAAEAAAPzAAAAGQAAAK4AAAABAAAALgAAAAEAAAEaAAAABf/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAAwAEAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AMiiiivkT9IP/9k=", "base64");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAAFXRFWHRDb21tZW50AHRha2VuIGF0IGhvbWV2YxoJAAAAlGVYSWZNTQAqAAAACAACAQ8AAgAAAAgAAAAmiCUABAAAAAEAAAAuAAAAAEhvbWVDYW0AAAQAAQACAAAAAlMAAAAAAgAFAAAAAwAAAGQAAwACAAAAAkUAAAAABAAFAAAAAwAAAHwAAAAAAAAAJAAAAAEAAAAzAAAAAQAAA/MAAAAZAAAArgAAAAEAAAAuAAAAAQAAARoAAAAFyp4VOQAAABdJREFUeJxjPBGgwUAKYCJJ9aiGEaQBAPsaAVivjNJxAAAAAElFTkSuQmCC", "base64");
const WEBP = Buffer.from("UklGRugAAABXRUJQVlA4WAoAAAAIAAAADwAACwAAVlA4IC4AAADQAQCdASoQAAwAAUAmJaACdLoB+AADsAD+6Di/+YJX5Bu1D/7B384D84D+igAARVhJRpQAAABNTQAqAAAACAACAQ8AAgAAAAgAAAAmiCUABAAAAAEAAAAuAAAAAEhvbWVDYW0AAAQAAQACAAAAAlMAAAAAAgAFAAAAAwAAAGQAAwACAAAAAkUAAAAABAAFAAAAAwAAAHwAAAAAAAAAJAAAAAEAAAAzAAAAAQAAA/MAAAAZAAAArgAAAAEAAAAuAAAAAQAAARoAAAAF", "base64");
const has = (b: Uint8Array, text: string) => Buffer.from(b).includes(Buffer.from(text));

describe("stripImageMetadata", () => {
  it("takes the camera and GPS details out of a JPEG and keeps the picture", () => {
    expect(has(JPEG, "HomeCam")).toBe(true);
    const out = stripImageMetadata("image/jpeg", JPEG);
    expect(has(out, "HomeCam")).toBe(false);
    expect(has(out, "Exif\0\0")).toBe(false);
    expect([out[0], out[1]]).toEqual([0xff, 0xd8]);
    expect([out[out.length - 2], out[out.length - 1]]).toEqual([0xff, 0xd9]);
  });

  it("does the same for PNG, text comments included", () => {
    const out = stripImageMetadata("image/png", PNG);
    expect(has(out, "HomeCam")).toBe(false);
    expect(has(out, "taken at home")).toBe(false);
    expect(has(out, "IEND")).toBe(true);
    expect(has(out, "IDAT")).toBe(true);
  });

  it("does the same for WebP, with the file's size and flags updated", () => {
    const out = stripImageMetadata("image/webp", WEBP);
    expect(has(out, "HomeCam")).toBe(false);
    expect(Buffer.from(out).readUInt32LE(4)).toBe(out.length - 8);
  });

  it("leaves a file without metadata, a GIF and a broken file as they came", () => {
    const clean = stripImageMetadata("image/jpeg", JPEG);
    expect(Buffer.from(stripImageMetadata("image/jpeg", clean)).equals(Buffer.from(clean))).toBe(true);
    const gif = Buffer.from("GIF89a....");
    expect(stripImageMetadata("image/gif", gif)).toBe(gif);
    const broken = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00]);
    expect(stripImageMetadata("image/jpeg", broken)).toBe(broken);
  });
});
