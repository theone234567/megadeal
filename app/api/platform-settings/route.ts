import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platformSettings";

// What the business portal needs to show: deal costs, which types are
// open and how long each can run. Nothing private, nothing an admin
// wrote as a note; the server enforces all of it again on submission.
export async function GET() {
  try {
    const { settings } = await getPlatformSettings();
    return NextResponse.json(
      {
        acceptSubmissions: settings.acceptSubmissions,
        everydayEnabled: settings.everydayEnabled,
        flashEnabled: settings.flashEnabled,
        chargeCredits: settings.chargeCredits,
        schedulingEnabled: settings.schedulingEnabled,
        everydayCredits: settings.everydayCredits,
        flashCredits: settings.flashCredits,
        everydayMaxDays: settings.everydayMaxDays,
        flashMaxHours: settings.flashMaxHours,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[platform-settings] read failed", err);
    return NextResponse.json({ error: "Couldn't load deal settings." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
