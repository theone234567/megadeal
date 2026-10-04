import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { readAdminAudit } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";

/** The admin audit trail (lib/adminAudit.ts), newest first. Admin only. */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  return NextResponse.json({ items: await readAdminAudit() }, { headers });
}
