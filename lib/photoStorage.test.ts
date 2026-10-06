import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isOwnMediaUrl, isUploadedPhotoUrl } from "./photoUrl";

/**
 * Photos in MegaDeal's own storage (lib/photoStorage.ts): uploaded through
 * the real /api/upload-photo route into a stand-in bucket, then served
 * back by the real /media route.
 */

const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
const bucket = {
  put: async (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => {
    stored.set(key, { bytes: new Uint8Array(value), contentType: options?.httpMetadata?.contentType });
  },
  get: async (key: string) => {
    const o = stored.get(key);
    return o ? { body: new Blob([o.bytes as Uint8Array<ArrayBuffer>]).stream(), httpMetadata: { contentType: o.contentType }, httpEtag: '"e1"', size: o.bytes.length } : null;
  },
};

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { PHOTOS: bucket } }) }));
vi.mock("@/lib/memberAuth", () => ({ getVerifiedMember: async () => ({ id: "m1", email: "a@b.nz", loginEmailVerified: true, nickname: null }) }));
vi.mock("@/lib/adminSession", () => ({ isAdminRequest: async () => false }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }), getClientIp: () => "1.2.3.4", getRateLimitKv: async () => null }));

const SITE = "https://megadeal.co.nz";
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const dataUrl = (type: string, bytes: Uint8Array) => `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

function upload(body: unknown) {
  return new NextRequest(`${SITE}/api/upload-photo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("which photo addresses the site accepts", () => {
  it("its own uploads and Wix's, nothing else", () => {
    expect(isOwnMediaUrl(`${SITE}/media/photos/2026-10/harbour-bistro-0a1b2c3d4e5f.jpg`, SITE)).toBe(true);
    expect(isUploadedPhotoUrl("https://static.wixstatic.com/media/a.jpg", SITE)).toBe(true);
    for (const bad of [
      "https://evil.example/media/photos/2026-10/x.jpg",
      `${SITE}/media/photos/2026-10/x.svg`,
      `${SITE}/media/photos/2026-10/../../admin.jpg`,
      `${SITE}/media/photos/2026-10/x.jpg?redirect=evil`,
      `http://megadeal.co.nz/media/photos/2026-10/x.jpg`,
      `${SITE}/api/thing.jpg`,
    ]) {
      expect(isUploadedPhotoUrl(bad, SITE), bad).toBe(false);
    }
  });
});

describe("uploading to MegaDeal's own storage", () => {
  beforeEach(() => {
    stored.clear();
    vi.stubEnv("PHOTO_STORAGE", "r2");
    vi.stubEnv("DATA_BACKEND", "postgres");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stores the photo under a new readable name and serves it back for a year", async () => {
    const { POST } = await import("@/app/api/upload-photo/route");
    const res = await POST(upload({ dataUrl: dataUrl("image/jpeg", JPEG), label: "Harbour Bistro!! 🐟" }));
    const { url, id } = await res.json();
    expect(id).toMatch(/^photos\/\d{4}-\d{2}\/harbour-bistro-[0-9a-f]{12}\.jpg$/);
    expect(url).toBe(`${SITE}/media/${id}`);
    expect(isUploadedPhotoUrl(url, SITE)).toBe(true);

    const { GET } = await import("@/app/media/[...key]/route");
    const served = await GET(new NextRequest(url), { params: Promise.resolve({ key: id.split("/") }) });
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/jpeg");
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(JPEG);
  });

  it("turns away a file that isn't the image it claims to be", async () => {
    const { POST } = await import("@/app/api/upload-photo/route");
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect((await POST(upload({ dataUrl: dataUrl("image/png", html) }))).status).toBe(400);
    expect((await POST(upload({ dataUrl: dataUrl("image/svg+xml", html) }))).status).toBe(400);
    expect(stored.size).toBe(0);
  });

  it("serves nothing outside the photos folder", async () => {
    const { GET } = await import("@/app/media/[...key]/route");
    for (const key of [["photos", "2026-10", "missing.jpg"], ["secrets.txt"], ["photos", "..", "x.jpg"]]) {
      const res = await GET(new NextRequest(`${SITE}/media/${key.join("/")}`), { params: Promise.resolve({ key }) });
      expect(res.status).toBe(404);
    }
  });

  it("stays on Wix while the data is still on Wix", async () => {
    vi.stubEnv("DATA_BACKEND", "wix");
    const { photoStorage } = await import("./photoStorage");
    expect(photoStorage()).toBe("wix");
  });
});
