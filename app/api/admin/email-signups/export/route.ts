import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";

function csvCell(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const verifiedOnly = req.nextUrl.searchParams.get("verifiedOnly") === "true";

  const adminClient = createWixAdminClient();
  const result = await adminClient.items.query("EmailSignups").find();
  let items = result.items ?? [];
  if (verifiedOnly) {
    items = items.filter((i: any) => i.verified && !i.unsubscribed);
  }

  const header = ["Email", "Audience", "Source", "Verified", "Unsubscribed", "Signed up"];
  const rows = items.map((i: any) => [
    i.email,
    i.audience,
    i.source,
    i.verified ? "Yes" : "No",
    i.unsubscribed ? "Yes" : "No",
    i._createdDate,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  const filename = verifiedOnly ? "email-signups-verified.csv" : "email-signups.csv";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
