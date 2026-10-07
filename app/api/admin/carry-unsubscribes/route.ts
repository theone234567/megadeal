import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { carryUnsubscribes } from "@/lib/db/carryUnsubscribes";
import { dataBackend, withDb } from "@/lib/db/connection";
import { readCollection, type WixReader } from "@/lib/db/exportWix";
import { SITE_URL } from "@/lib/siteConfig";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * Admin only: marks unsubscribed in MegaDeal's database anyone who
 * unsubscribed in Wix (lib/db/carryUnsubscribes.ts), for the minutes
 * between the import and the switch. Only once the site runs on the new
 * database, while Wix can still be read. Only ever unsubscribes.
 */
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);
  if (dataBackend() !== "postgres") return json({ error: "Not needed yet: the site still reads its subscribers from Wix." }, 409);

  let signups: Record<string, unknown>[];
  try {
    signups = await readCollection(createWixAdminClient() as unknown as WixReader, "EmailSignups");
  } catch (err) {
    console.error("[admin/carry-unsubscribes] reading Wix failed", err);
    return json({ error: "Couldn't read the subscribers in Wix. Please try again." }, 502);
  }
  try {
    const result = await withDb((db) => carryUnsubscribes(db, signups));
    if (result.newlyUnsubscribed) {
      await logAdminAction({ action: "Brought over unsubscribes from Wix", detail: `${result.newlyUnsubscribed} newly unsubscribed` });
    }
    return json(result);
  } catch (err) {
    console.error("[admin/carry-unsubscribes] failed", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
