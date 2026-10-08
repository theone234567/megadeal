import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { dataBackend, withDb } from "@/lib/db/connection";

/**
 * The contact form's messages, newest first, for Admin > Messages. Each is
 * also emailed to the admin, but that email can fail (the day's sending
 * allowance used up, say) while the message is saved: this is where it
 * can still be read.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Only kept in MegaDeal's own database; Wix kept its copy in Wix.
  if (dataBackend() !== "postgres") return NextResponse.json({ items: [] });
  try {
    const items = await withDb((db) =>
      db.query<{ id: string; name: string; email: string; message: string; createdAt: string }>(
        `select id::text, name, email, message, created_at as "createdAt"
           from public.contact_messages order by created_at desc, id desc limit 200`
      )
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/contact-messages] failed", err);
    return NextResponse.json({ error: "Couldn't load the messages. Refresh to try again." }, { status: 500 });
  }
}
