import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { getPlatformSettings, getSettingsHistory, savePlatformSettings } from "@/lib/platformSettings";

// Admin only: the platform settings, their version and change history.
// Never cached: every read reflects the latest save.
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  try {
    const [stored, history] = await Promise.all([getPlatformSettings(), getSettingsHistory()]);
    return NextResponse.json({ ...stored, history, launched: SITE_LAUNCHED }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/platform-settings] read failed", err);
    return NextResponse.json({ error: "Couldn't load the settings. Please try again." }, { status: 503, headers: NO_STORE });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  try {
    // Only `settings` and `version` are read; the settings themselves are
    // rebuilt key by key from known fields (parsePlatformSettings).
    const result = await savePlatformSettings(body.settings, body.version, "Admin");
    if (!result.ok) {
      return NextResponse.json({ error: result.error, errors: result.errors }, { status: result.status, headers: NO_STORE });
    }
    const history = await getSettingsHistory();
    return NextResponse.json({ ...result.stored, history, launched: SITE_LAUNCHED, changes: result.changes }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/platform-settings] save failed", err);
    return NextResponse.json({ error: "Couldn't save the settings. Please try again." }, { status: 503, headers: NO_STORE });
  }
}
