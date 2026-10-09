import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { fromOwnSite } from "@/lib/authSession";
import { dataBackend, withDb } from "@/lib/db/connection";
import { MESSAGES_SEEN_KEY } from "@/lib/kvMarkers";
import { getRateLimitKv } from "@/lib/rateLimit";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * The contact form's messages, newest first, for Admin > Messages. Each is
 * also emailed to the admin, but that email can fail (the day's sending
 * allowance used up, say) while the message is saved: this is where it
 * can still be read.
 *
 * GET gives the latest 200 and `unseen`, how many came in after the newest
 * one an admin has had on screen (?summary=1: only that, for Needs
 * attention). POST { id }, sent when the Messages tab has shown them,
 * marks everything up to that message seen, on the server so it holds on
 * every device.
 */
async function seenUpTo(): Promise<string | null> {
  try {
    return (await (await getRateLimitKv())?.get(MESSAGES_SEEN_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Only kept in MegaDeal's own database; Wix kept its copy in Wix.
  if (dataBackend() !== "postgres") return NextResponse.json({ items: [], unseen: 0 });
  const summary = req.nextUrl.searchParams.get("summary") === "1";
  try {
    const seen = await seenUpTo();
    const { items, unseen } = await withDb(async (db) => {
      const [count] = await db.query<{ n: number }>(
        "select count(*)::int as n from public.contact_messages where $1::timestamptz is null or created_at > $1::timestamptz",
        [seen]
      );
      const items = summary
        ? []
        : await db.query<{ id: string; name: string; email: string; message: string; createdAt: string }>(
            `select id::text, name, email, message, created_at as "createdAt"
               from public.contact_messages order by created_at desc, id desc limit 200`
          );
      return { items, unseen: count?.n ?? 0 };
    });
    return NextResponse.json(summary ? { unseen } : { items, unseen });
  } catch (err) {
    console.error("[admin/contact-messages] failed", err);
    return NextResponse.json({ error: "Couldn't load the messages. Refresh to try again." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!fromOwnSite(req, SITE_URL)) return NextResponse.json({ error: "Use the admin page." }, { status: 403 });
  if (dataBackend() !== "postgres") return NextResponse.json({ ok: true });
  try {
    // Up to the newest message the tab showed, named by its id, with its
    // time read here (never a time sent by the page): one that arrived
    // after the tab loaded stays unseen.
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" && /^[0-9]{1,18}$/.test(body.id) ? body.id : null;
    if (!id) return NextResponse.json({ error: "Which message?" }, { status: 400 });
    const [newest] = await withDb((db) =>
      db.query<{ at: string | null }>("select to_json(created_at) #>> '{}' as at from public.contact_messages where id = $1::bigint", [id])
    );
    const kv = await getRateLimitKv();
    // Only ever forwards: an older tab left open can't bring back
    // messages already read elsewhere.
    const before = await seenUpTo();
    if (newest?.at && kv && !(before && new Date(before) >= new Date(newest.at))) await kv.put(MESSAGES_SEEN_KEY, newest.at);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/contact-messages] marking seen failed", err);
    return NextResponse.json({ error: "Couldn't mark the messages as read." }, { status: 500 });
  }
}
