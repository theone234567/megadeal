import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { checkReadiness } from "@/lib/migrationReadiness";

export const dynamic = "force-dynamic";

/** Admin only: what's ready for each step off Wix (lib/migrationReadiness.ts). */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    return NextResponse.json(await checkReadiness(), { headers });
  } catch (err) {
    console.error("[admin/move-off-wix] failed", err);
    return NextResponse.json({ error: "The checks couldn't run. Please try again." }, { status: 500, headers });
  }
}
