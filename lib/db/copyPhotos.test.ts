import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./testDb";
import { copyWixPhotos } from "./copyPhotos";
import { isUploadedPhotoUrl } from "../photoUrl";
import type { Sql } from "./sql";

const SITE = "https://megadeal.co.nz";
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]);
const W = (n: string) => `https://static.wixstatic.com/media/${n}.jpg`;

let pglite: PGlite;
let db: Sql;
const stored = new Map<string, Uint8Array>();
const bucket = {
  put: async (key: string, value: Uint8Array) => void stored.set(key, value),
  get: async () => null,
};
// Wix, as far as this test is concerned: one photo has gone, one isn't an image.
const fetchWix = async (url: string) =>
  url.includes("gone") ? new Response("", { status: 404 }) : url.includes("page") ? new Response("<html>") : new Response(JPEG);

beforeAll(async () => {
  pglite = (await createTestDb()).db;
  db = { query: async (text, params) => (await pglite.query<any>(text, params as any[])).rows };
  const [{ id }] = await db.query<{ id: string }>(
    "insert into public.merchants (email, business_name, status, logo_url, photos) values ('a@b.nz', 'Bistro', 'Approved', $1, $2) returning id",
    [W("logo"), JSON.stringify([W("p1"), W("gone"), W("p1")])]
  );
  await db.query("insert into public.deals (merchant_id, status, photo_url) values ($1, 'Draft', $2), ($1, 'Draft', $3)", [id, W("p1"), W("page")]);
}, 60_000);
afterAll(async () => {
  await pglite?.close();
});

describe("copying photos off Wix", () => {
  it("copies each photo once, points every row at the copy, and lists what it couldn't", async () => {
    // As the admin route is used: batches of two, passing over failures.
    let skip = 0;
    let copied = 0;
    const failed: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await copyWixPhotos(db, bucket, fetchWix, SITE, { limit: 2, skip });
      copied += r.copied;
      failed.push(...r.failed.map((f) => f.reason));
      skip += r.failed.length;
      if (r.remaining === 0) break;
    }
    expect(copied).toBe(2);
    expect(failed.sort()).toEqual(["Wix answered 404", "not a JPEG, PNG, WebP or GIF"]);
    // Running it again finds nothing new to do.
    expect(await copyWixPhotos(db, bucket, fetchWix, SITE, { skip: 2 })).toMatchObject({ copied: 0, remaining: 0 });

    expect(stored.size).toBe(2);
    const [m] = await db.query("select logo_url, photos from public.merchants");
    expect(isUploadedPhotoUrl(m.logo_url, SITE) && !m.logo_url.includes("wixstatic")).toBe(true);
    // Both copies of p1 point at the one stored file; the missing one stays as it was.
    expect(m.photos[0]).toBe(m.photos[2]);
    expect(m.photos[1]).toBe(W("gone"));
    const deals = await db.query<{ photo_url: string }>("select photo_url from public.deals order by photo_url");
    expect(deals.map((d) => d.photo_url.includes("/media/photos/"))).toEqual([true, false]);
    expect(deals.find((d) => d.photo_url.includes("/media/"))!.photo_url).toBe(m.photos[0]);
  });
});
