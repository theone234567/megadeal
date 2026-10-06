import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { withDb } from "@/lib/db/connection";
import { copyWixPhotos } from "@/lib/db/copyPhotos";
import { photoBucket, photoStorage } from "@/lib/photoStorage";
import { logAdminAction } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Admin only: copies the next few photos still on Wix into MegaDeal's own
 * storage (lib/db/copyPhotos.ts). Call again, passing back `skip`, until
 * `remaining` is 0. Only once the new database and photo storage are both
 * switched on.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (photoStorage() !== "r2") {
    return NextResponse.json({ error: "Switch on the new database and photo storage first (DATA_BACKEND=postgres, PHOTO_STORAGE=r2)." }, { status: 409 });
  }
  const bucket = await photoBucket();
  if (!bucket) return NextResponse.json({ error: "No PHOTOS bucket is connected." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
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
