import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllItems } from "@/lib/queryAll";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createWixAdminClient();
    const items = await queryAllItems(() => adminClient.items.query("EmailSignups"), "EmailSignups (admin)");
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/email-signups] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
