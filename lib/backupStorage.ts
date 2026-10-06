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

/** backups/2026-10-06T14-23-00Z.json.gz: sorts by when it was taken. */
export const backupKey = (now: Date) => `backups/${now.toISOString().slice(0, 19).replace(/:/g, "-")}Z.json.gz`;

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
