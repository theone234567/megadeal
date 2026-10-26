import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
import { isAdminRequest } from "@/lib/adminSession";
import { withDb } from "@/lib/db/connection";
import { copyWixPhotos } from "@/lib/db/copyPhotos";
import { photoBucket } from "@/lib/photoStorage";
import { logAdminAction } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Admin only: copies the next few photos still on Wix into MegaDeal's own
 * storage (lib/db/copyPhotos.ts). Call again, passing back `skip`, until
 * `remaining` is 0. Needs no Wix account: the photos are public files on
 * Wix's servers.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const bucket = await photoBucket();
  if (!bucket) return NextResponse.json({ error: "No PHOTOS bucket is connected." }, { status: 503 });

  const body = ((await readSmallJson(req, JSON_BODY_MAX)) ?? {});
  const skip = Number.isInteger(body?.skip) && body.skip >= 0 ? body.skip : 0;
  try {
    const result = await withDb((db) => copyWixPhotos(db, bucket, (url) => fetch(url), SITE_URL, { skip }));
    if (result.copied) await logAdminAction({ action: "Photos copied from Wix", detail: `${result.copied} copied, ${result.remaining} left` });
    return NextResponse.json({ ...result, skip: skip + result.failed.length });
  } catch (err) {
    console.error("[admin/copy-photos] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
