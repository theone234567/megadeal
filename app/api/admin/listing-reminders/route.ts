import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { withDb } from "@/lib/db/connection";
import { reminderCandidates, sendListingReminders } from "@/lib/listingReminders";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Admin only: businesses whose listing isn't finished a day after signing
 * up (GET, with what each is missing), and emailing them a reminder
 * (POST, a batch at a time). lib/listingReminders.ts.
 */

const headers = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    const candidates = await withDb(reminderCandidates);
    return NextResponse.json({ candidates }, { headers });
  } catch (err) {
    console.error("[admin/listing-reminders] list failed", err);
    return NextResponse.json({ error: "Couldn't check. Please try again." }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  // It emails real businesses: only from the admin page itself.
  if (!fromOwnSite(req, SITE_URL)) return NextResponse.json({ error: "Use the admin page." }, { status: 403, headers });
  try {
    const result = await withDb((db) => sendListingReminders(db, SITE_URL));
    if (result.sent || result.failed.length) {
      await logAdminAction({
        action: "Emailed finish-your-listing reminders",
        detail: `${result.sent} sent${result.failed.length ? `, couldn't send to ${result.failed.join(", ")}` : ""}`,
      });
    }
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("[admin/listing-reminders] send failed", err);
    return NextResponse.json({ error: "Sending stopped. Please try again." }, { status: 500, headers });
  }
}
