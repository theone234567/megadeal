import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { queryAllItems } from "@/lib/queryAll";

function csvCell(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const verifiedOnly = req.nextUrl.searchParams.get("verifiedOnly") === "true";

  try {
    const adminClient = createWixAdminClient();
    // Paged: this exports the mailing list, and a default page of 50 meant
    // handing over an incomplete list that looked complete. The
    // verifiedOnly filter then narrowed that truncated 50 further.
    const all = await queryAllItems(
      () => adminClient.items.query("EmailSignups"),
      "EmailSignups (export)"
    );
    const items = verifiedOnly
      ? all.filter((i: any) => i.verified && !i.unsubscribed)
      : all;

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
  } catch (err) {
    console.error("[admin/email-signups/export] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
