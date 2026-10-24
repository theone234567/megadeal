import "server-only";

/**
 * Google Safe Browsing (SEO pack T207), when GOOGLE_SAFE_BROWSING_KEY is
 * set: links on a known list of phishing or malware sites never auto-post.
 * Without a key nothing is looked up (lib/linkSafety.ts still holds any
 * link that isn't the business's own or a known booking platform). A
 * lookup that fails holds the deal, as the task asks: unchecked isn't safe.
 */
const ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export async function safeBrowsingProblems(urls: { field: string; url: string }[]): Promise<string[]> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY?.trim();
  const list = urls.filter((u) => u.url.trim());
  if (!key || list.length === 0) return [];
  try {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "megadeal", clientVersion: "1" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: list.map((u) => ({ url: u.url.trim() })),
        },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return ["the links couldn't be checked against Google Safe Browsing just now"];
    const json = (await res.json().catch(() => ({}))) as { matches?: { threat?: { url?: string } }[] };
    const bad = new Set((json.matches ?? []).map((m) => m.threat?.url).filter(Boolean));
    return list.filter((u) => bad.has(u.url.trim())).map((u) => `${u.field} is on Google's list of unsafe sites`);
  } catch {
    return ["the links couldn't be checked against Google Safe Browsing just now"];
  }
}
