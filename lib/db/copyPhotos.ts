import { createHash } from "crypto";
import { isWixMediaUrl } from "../photoUrl";
import { MEDIA_PATH, type PhotoBucket } from "../photoStorage";
import type { Sql } from "./sql";

/**
 * Copies photos still on Wix (static.wixstatic.com) into MegaDeal's own
 * storage and points each business and deal at the copy. A few at a time
 * (a request can only run so long), so it's called until nothing is left;
 * app/api/admin/copy-photos does that.
 *
 * Safe to stop and re-run: a photo's new name comes from its Wix address,
 * so copying it twice writes the same file, and a row is only changed
 * after its copy is stored.
 */

const MAX_BYTES = 10_000_000;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

type Fetch = (url: string) => Promise<Response>;

export interface CopyResult {
  copied: number;
  failed: { url: string; reason: string }[];
  remaining: number;
}

function keyFor(url: string, ext: string, now: Date): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return `photos/${now.toISOString().slice(0, 7)}/wix-${hash}.${ext}`;
}

const sniff = (b: Uint8Array): string | null =>
  b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    ? "image/jpeg"
    : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      ? "image/png"
      : b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46
        ? "image/gif"
        : b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
          ? "image/webp"
          : null;

/** Every Wix photo address still in use, oldest rows first. */
const PENDING_SQL = `
  select url from (
    select logo_url as url, created_at from public.merchants where logo_url like 'https://%wixstatic.com/%'
    union all
    select p.url, m.created_at from public.merchants m, jsonb_array_elements_text(m.photos) as p(url) where p.url like 'https://%wixstatic.com/%'
    union all
    select photo_url, created_at from public.deals where photo_url like 'https://%wixstatic.com/%'
    union all
    select pending_photo_url, created_at from public.deals where pending_photo_url like 'https://%wixstatic.com/%'
  ) x group by url order by min(created_at), url`;

/** How many Wix photo addresses are still in use. */
export async function countWixPhotos(db: Sql): Promise<number> {
  const [row] = await db.query<{ n: string }>(`select count(*) as n from (${PENDING_SQL}) pending`);
  return Number(row?.n ?? 0);
}

/**
 * `skip`: how many still-pending photos to pass over, i.e. the ones that
 * failed in earlier batches of this run, so a photo Wix won't give us
 * can't hold up the rest.
 */
export async function copyWixPhotos(db: Sql, bucket: PhotoBucket, fetchFn: Fetch, siteUrl: string, opts: { limit?: number; skip?: number; now?: Date } = {}): Promise<CopyResult> {
  const { limit = 15, skip = 0, now = new Date() } = opts;
  const pending = (await db.query<{ url: string }>(PENDING_SQL)).map((r) => r.url);
  const result: CopyResult = { copied: 0, failed: [], remaining: 0 };
  const base = siteUrl.replace(/\/$/, "");

  for (const url of pending.slice(skip, skip + limit)) {
    if (!isWixMediaUrl(url)) {
      result.failed.push({ url, reason: "not a Wix photo address" });
      continue;
    }
    try {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`Wix answered ${res.status}`);
      // Checked before reading, so an oversized file is never held in memory.
      if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("empty or too large");
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error("empty or too large");
      const type = sniff(bytes);
      if (!type) throw new Error("not a JPEG, PNG, WebP or GIF");
      const key = keyFor(url, TYPES[type], now);
      await bucket.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
      const next = `${base}${MEDIA_PATH}${key}`;
      await db.query("update public.merchants set logo_url = $2 where logo_url = $1", [url, next]);
      await db.query(
        `update public.merchants set photos = (select jsonb_agg(case when p = $1 then $2 else p end) from jsonb_array_elements_text(photos) p)
          where photos ? $1`,
        [url, next]
      );
      await db.query("update public.deals set photo_url = $2 where photo_url = $1", [url, next]);
      await db.query("update public.deals set pending_photo_url = $2 where pending_photo_url = $1", [url, next]);
      result.copied++;
    } catch (err) {
      result.failed.push({ url, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  result.remaining = Math.max(0, pending.length - skip - result.copied - result.failed.length);
  return result;
}
