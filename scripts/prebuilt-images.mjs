#!/usr/bin/env node
/**
 * Run after `opennextjs-cloudflare build` (npm run cf:build): copies the
 * share images and icons Next drew at build time into the Worker's static
 * assets, under cdn-cgi/_prebuilt/ (only the Worker itself can read
 * cdn-cgi/), so worker.mjs can answer with the file instead of drawing the
 * image again (lib/assetCache.ts withPrebuiltImage).
 *
 * Drawing a PNG is the heaviest work the site does, and on Cloudflare's CPU
 * limit it failed often enough for Search Console to report
 * /opengraph-image as a server error (Oct 2026).
 */
import fs from "node:fs";
import path from "node:path";

const out = ".open-next";
const cacheRoot = path.join(out, "cache");
const target = path.join(out, "assets", "cdn-cgi", "_prebuilt");
const EXT = { "image/png": ".png", "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico", "image/jpeg": ".jpg" };

if (!fs.existsSync(cacheRoot)) {
  console.log("[prebuilt-images] no OpenNext build output; nothing to copy");
  process.exit(0);
}
const builds = fs.readdirSync(cacheRoot).filter((d) => d !== "__fetch");
let copied = 0;
for (const build of builds) {
  const root = path.join(cacheRoot, build);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".cache")) {
        const item = JSON.parse(fs.readFileSync(file, "utf8"));
        const type = item?.meta?.headers?.["content-type"] ?? "";
        const ext = EXT[type];
        if (item?.type !== "route" || item?.meta?.status !== 200 || !ext || typeof item.body !== "string") continue;
        const route = file.slice(root.length).replace(/\.cache$/, "");
        // /icon.png keeps its name; /opengraph-image becomes opengraph-image.png.
        const dest = path.join(target, path.extname(route) ? route : `${route}${ext}`);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(item.body, "base64"));
        copied++;
      }
    }
  };
  walk(root);
}
console.log(`[prebuilt-images] ${copied} prebuilt images copied to ${target}`);
