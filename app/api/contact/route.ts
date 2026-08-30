import { NextRequest, NextResponse } from "next/server";
import { createWixAdminClient } from "@/lib/wixAdmin";

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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
