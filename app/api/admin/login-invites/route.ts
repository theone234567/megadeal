import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { authBackend, fromOwnSite } from "@/lib/authSession";
import { withDb } from "@/lib/db/connection";
import { businessesWithoutLogin, sendLoginInvites } from "@/lib/loginInvites";
import { SITE_URL } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

/**
 * Admin only, once logins are on MegaDeal's own system: how many
 * businesses haven't set a password yet (GET), and emailing them a link
 * to set one (POST, a batch at a time; call again until `remaining` is 0).
 * lib/loginInvites.ts.
 */

const headers = { "Cache-Control": "private, no-store" };

function notReady() {
  return NextResponse.json({ error: "Switch business logins to MegaDeal's own system first (AUTH_BACKEND=supabase)." }, { status: 409, headers });
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  if (authBackend() !== "supabase") return notReady();
  try {
    const list = await withDb(businessesWithoutLogin);
    return NextResponse.json({ waiting: list.length }, { headers });
  } catch (err) {
    console.error("[admin/login-invites] list failed", err);
    return NextResponse.json({ error: "Couldn't check. Please try again." }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  // It emails real businesses: only from the admin page itself.
  if (!fromOwnSite(req, SITE_URL)) return NextResponse.json({ error: "Use the admin page." }, { status: 403, headers });
  if (authBackend() !== "supabase") return notReady();
  try {
    const result = await withDb((db) => sendLoginInvites(db, SITE_URL));
    if (result.sent || result.failed.length) {
      await logAdminAction({
        action: "Emailed set-password links",
        detail: `${result.sent} sent${result.failed.length ? `, couldn't send to ${result.failed.join(", ")}` : ""}`,
      });
    }
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("[admin/login-invites] send failed", err);
    return NextResponse.json({ error: "Sending stopped. Please try again." }, { status: 500, headers });
  }
}
