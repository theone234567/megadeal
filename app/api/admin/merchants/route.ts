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
    // Paged: the dashboard's own search and pagination were operating on
    // whatever 50 rows happened to come back first.
    const items = await queryAllItems(
      () => adminClient.items.query("Merchants"),
      "Merchants (admin)"
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/merchants] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
