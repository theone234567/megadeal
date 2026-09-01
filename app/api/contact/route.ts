import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { escapeHtml } from "@/lib/escapeHtml";

// This route stores the message only — it must never add the sender to the
// Resend marketing audience. There's no consent checkbox on the contact
// form, so doing that would be sending marketing email without opt-in.
// If you need to offer a mailing-list opt-in here, add a separate checkbox
// and call addResendContact() only when it's checked, same as EmailSignupForm.

const MAX_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = cleanText(body.name, 200);
  const email = cleanText(body.email, 200);
  const message = cleanText(body.message, MAX_LENGTH);

  if (!name || !message) {
    return NextResponse.json({ error: "Name and message are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    await adminClient.items.insert("ContactMessages", { name, email, message });
  } catch (err) {
    console.error("[contact] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Best-effort admin notification — the message is already saved above, so
  // a failure here shouldn't turn into an error for the person submitting.
  const notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
  if (notifyTo) {
    sendTransactionalEmail({
      to: notifyTo,
      subject: `New contact message from ${name}`,
      html: `
        <div style="font-family:'Segoe UI',ui-rounded,system-ui,sans-serif;font-size:15px;color:#211033;">
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    }).catch((err) => console.error("[contact] admin notify failed", err));
  }

  return NextResponse.json({ ok: true });
}
