import { NextRequest } from "next/server";
import { photoBucket } from "@/lib/photoStorage";

/**
 * Serves uploaded photos from MegaDeal's own storage (lib/photoStorage.ts)
 * at /media/photos/…. Each upload has a new name, so a copy is good for a
 * year anywhere it's cached. Images only, never sniffed as anything else.
 */
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_req: NextRequest, props: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await props.params;
  const key = parts.join("/");
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (!/^photos\/[0-9]{4}-[0-9]{2}\/[a-z0-9-]+\.[a-z]+$/.test(key) || !TYPES[ext]) return notFound();

  const bucket = await photoBucket();
  const object = bucket ? await bucket.get(key) : null;
  if (!object) return notFound();

  return new Response(object.body, {
    headers: {
      "Content-Type": TYPES[ext],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ...(object.httpEtag ? { ETag: object.httpEtag } : {}),
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}
