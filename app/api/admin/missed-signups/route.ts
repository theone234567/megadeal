import { NextRequest, NextResponse } from "next/server";
import { JSON_BODY_MAX, readSmallJson } from "@/lib/readJsonBody";
import { isAdminRequest } from "@/lib/adminSession";
import { fromOwnSite } from "@/lib/authSession";
import { logAdminAction } from "@/lib/adminAudit";
import { forgetMissedSignup, missedSignups } from "@/lib/missedSignups";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * Businesses whose sign-up code couldn't be sent (lib/missedSignups.ts),
 * for Admin > Needs attention. GET lists them, newest first; POST { email }
 * marks one done, once the admin has been in touch.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ items: await missedSignups() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!fromOwnSite(req, SITE_URL)) return NextResponse.json({ error: "Use the admin page." }, { status: 403 });
  const body = await readSmallJson(req, JSON_BODY_MAX);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || email.length > 320) return NextResponse.json({ error: "Which business?" }, { status: 400 });
  await forgetMissedSignup(email);
  await logAdminAction({ action: "Missed sign-up marked done", target: email });
  return NextResponse.json({ items: await missedSignups() });
}
