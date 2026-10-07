import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Where the nightly backups go (lib/db/backup.ts): a private R2 bucket of
 * their own, the BACKUPS binding in wrangler.toml. Separate from the
 * photos bucket, which the site serves to the public: nothing serves this
 * one. A lifecycle rule on the bucket deletes copies after 30 days.
 */

export interface BackupObject {
  key: string;
  uploaded: Date;
  size: number;
}

export interface BackupBucket {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string; contentEncoding?: string } }): Promise<unknown>;
  list(options: { prefix: string; cursor?: string }): Promise<{ objects: BackupObject[]; truncated: boolean; cursor?: string }>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
}

declare global {
  interface CloudflareEnv {
    BACKUPS?: BackupBucket;
  }
}

export async function backupBucket(): Promise<BackupBucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.BACKUPS ?? null;
  } catch {
    return null;
  }
}

const stamp = (now: Date) => now.toISOString().slice(0, 19).replace(/:/g, "-");

/** backups/2026-10-06T14-23-00Z.json.gz: sorts by when it was taken. */
export const backupKey = (now: Date) => `backups/${stamp(now)}Z.json.gz`;

/** wix-copies/2026-10-06T14-23-00Z.json.gz: a copy of everything in Wix
 *  (app/api/admin/save-copy), kept apart from the database's copies. */
export const wixCopyKey = (now: Date) => `wix-copies/${stamp(now)}Z.json.gz`;

/** Where the nightly job notes its last run ({ at, result }, in RATE_LIMIT_KV),
 *  so Moving off Wix can say it's running before there's anything to copy. */
export const LAST_RUN_KEY = "cron:backup:last";

/** A database copy's name, as backupKey makes it: nothing else is restored. */
export const BACKUP_KEY = /^backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.json\.gz$/;

/** The database copies in the bucket, newest first. */
export async function listBackups(bucket: BackupBucket): Promise<BackupObject[]> {
  const all: BackupObject[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const res = await bucket.list({ prefix: "backups/", cursor });
    all.push(...res.objects.filter((o) => BACKUP_KEY.test(o.key)));
    if (!res.truncated) break;
    cursor = res.cursor;
  }
  return all.sort((a, b) => (a.key < b.key ? 1 : -1));
}

/** The newest copy of Wix (app/api/admin/save-copy), or null. */
export async function latestWixCopy(bucket: BackupBucket): Promise<BackupObject | null> {
  const res = await bucket.list({ prefix: "wix-copies/" });
  return res.objects.reduce<BackupObject | null>((a, o) => (!a || o.key > a.key ? o : a), null);
}

/** The newest backup in the bucket, or null. */
export async function latestBackup(bucket: BackupBucket): Promise<BackupObject | null> {
  let latest: BackupObject | null = null;
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const res = await bucket.list({ prefix: "backups/", cursor });
    for (const o of res.objects) if (!latest || o.key > latest.key) latest = o;
    if (!res.truncated) break;
    cursor = res.cursor;
  }
  return latest;
}
