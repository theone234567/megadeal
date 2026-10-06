import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { queryAllItems } from "@/lib/queryAll";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const adminClient = createDataClient();
    // Drafts are excluded: a draft has not been submitted, so there is
    // nothing for an admin to approve or reject, and listing it beside
    // real submissions invites acting on work the merchant hasn't
    // finished. It also keeps them out of the row budget below.
    const items = await queryAllItems(() => adminClient.items.query("Deals").ne("status", "Draft"), "Deals (admin)");
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/deals] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
