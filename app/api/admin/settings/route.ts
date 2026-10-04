import { NextRequest, NextResponse } from "next/server";
import { auditTarget, logAdminAction } from "@/lib/adminAudit";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { getSiteRudenessCheck, setSiteRudenessCheck } from "@/lib/rudenessSetting";

/** Site-wide admin settings. Currently just the rudeness check. */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const adminClient = createWixAdminClient();
  return NextResponse.json({ rudenessCheck: await getSiteRudenessCheck(adminClient) });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.rudenessCheck !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const adminClient = createWixAdminClient();
    await setSiteRudenessCheck(adminClient, body.rudenessCheck);
    await logAdminAction({ action: "Setting changed", detail: `Rudeness check ${body.rudenessCheck ? "on" : "off"}` });
    return NextResponse.json({ rudenessCheck: body.rudenessCheck });
  } catch (err) {
    console.error("[admin/settings] save failed", err);
    return NextResponse.json({ error: "Couldn't save the setting. Please try again." }, { status: 500 });
  }
}
