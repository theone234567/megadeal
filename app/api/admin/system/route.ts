import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { checkReadiness } from "@/lib/systemChecks";

export const dynamic = "force-dynamic";

/** Admin only: the System checks page's checks (lib/systemChecks.ts). */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  try {
    return NextResponse.json(await checkReadiness(), { headers });
  } catch (err) {
    console.error("[admin/system] failed", err);
    return NextResponse.json({ error: "The checks couldn't run. Please try again." }, { status: 500, headers });
  }
}
