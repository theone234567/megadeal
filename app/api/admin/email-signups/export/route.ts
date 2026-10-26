import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { createDataClient } from "@/lib/dataClient";
import { queryAllItems } from "@/lib/queryAll";
import { csvCell } from "@/lib/csv";
import { logAdminAction } from "@/lib/adminAudit";
import { getClientIp } from "@/lib/rateLimit";


export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const verifiedOnly = req.nextUrl.searchParams.get("verifiedOnly") === "true";

  try {
    const adminClient = createDataClient();
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
    // A download of people's email addresses goes in the admin activity
    // log, like every change does (T255, T215).
    await logAdminAction({
      action: "Exported email sign-ups",
      detail: `${items.length} address${items.length === 1 ? "" : "es"}${verifiedOnly ? ", confirmed only" : ""}`,
      ip: getClientIp(req),
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[admin/email-signups/export] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
