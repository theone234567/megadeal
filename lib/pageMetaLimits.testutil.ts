import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { expect, it } from "vitest";

/**
 * Search-result limits for every page with fixed metadata, so a wording
 * change can't quietly push a page past what Google shows. Used by
 * pageMeta.test.ts (launched) and pageMetaPrelaunch.test.ts, which mock
 * SITE_LAUNCHED each way; new pages are picked up by themselves.
 *
 * Titles include the " | MegaDeal" the layout adds. Google shows about
 * 60 characters of a title and 155–160 of a description.
 */
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;
const SUFFIX = " | MegaDeal";

const ROOT = join(__dirname, "..");

function pagesWithMetadata(dir = join(ROOT, "app")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // Local design pages, never committed (.git/info/exclude).
    if (name.startsWith("dev-")) return [];
    if (statSync(path).isDirectory()) return pagesWithMetadata(path);
    return name === "page.tsx" && /export const metadata\b/.test(readFileSync(path, "utf8")) ? [path] : [];
  });
}

export function checkPageMetadata() {
  const seenTitles = new Map<string, string>();
  const seenDescriptions = new Map<string, string>();
  for (const path of pagesWithMetadata()) {
    const name = relative(ROOT, path);
    it(name, async () => {
      let mod: { metadata: { title?: unknown; description?: string | null; robots?: unknown } };
      try {
        mod = await import(/* @vite-ignore */ path);
      } catch (err) {
        // Server-only pages (React's cache() and the like) don't load
        // outside Next; their titles come from shared helpers tested elsewhere.
        if (/cache is not a function/.test(String(err))) return;
        throw err;
      }
      const { title, description, robots } = mod.metadata;
      if (robots && (robots as { index?: boolean }).index === false) return;

      expect(typeof title, "a plain title, so the layout adds the brand").toBe("string");
      const full = `${title}${SUFFIX}`;
      expect(full.length, full).toBeLessThanOrEqual(TITLE_MAX);
      expect(description, "a description").toBeTruthy();
      expect(description!.length, description!).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(description!.length, description!).toBeLessThanOrEqual(DESCRIPTION_MAX);

      expect(seenTitles.get(full), `same title as ${seenTitles.get(full)}`).toBeUndefined();
      expect(seenDescriptions.get(description!), `same description as ${seenDescriptions.get(description!)}`).toBeUndefined();
      seenTitles.set(full, name);
      seenDescriptions.set(description!, name);
    });
  }
}
