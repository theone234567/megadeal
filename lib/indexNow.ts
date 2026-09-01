import "server-only";
import { SITE_URL } from "./siteConfig";

/**
 * IndexNow key: a bearer token proving submissions come from this site,
 * verified by participating search engines fetching
 * `${SITE_URL}/${INDEXNOW_KEY}.txt` (see public/00e2216bb07e028e38c3d30eeaebd7b9.txt)
 * and checking its contents match. Rotating the key just means generating a
 * new one and publishing a matching key file.
 */
export const INDEXNOW_KEY = "00e2216bb07e028e38c3d30eeaebd7b9";

/**
 * Best-effort push to the IndexNow API (bing.com, Yandex, and other
 * participating engines all poll it) so new/changed pages get crawled
 * immediately instead of waiting on each engine's own discovery schedule —
 * Bing in particular can otherwise take a long time to find a newer,
 * low-backlink site on its own. Never throws: a failed push just means we
 * fall back to normal discovery via sitemap.xml, same as before this
 * existed, so it's fine to call this without awaiting from a request path
 * that shouldn't be slowed down by it.
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<void> {
  const urlList = urls.filter(Boolean);
  if (urlList.length === 0) return;
  try {
    const host = new URL(SITE_URL).host;
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    if (!res.ok) {
      console.error("[indexNow] submission rejected", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[indexNow] submission failed", err);
  }
}
