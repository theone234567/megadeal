import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Admin two-factor setup (app/admin/two-factor). GET: whether it's on, and
 * a fresh secret to add to an authenticator app (nothing is stored here;
 * it only takes effect once saved as ADMIN_TOTP_SECRET in Cloudflare).
 * POST { secret, code }: checks the app is showing the right codes for
 * that secret before it's saved anywhere.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const secret = generateTotpSecret();
  return NextResponse.json({ enabled: Boolean(process.env.ADMIN_TOTP_SECRET), secret, uri: totpUri(secret) }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: NO_STORE });
  const body = await req.json().catch(() => null);
  const ok = verifyTotp(String(body?.secret ?? ""), String(body?.code ?? "")) !== null;
  if (!ok) {
    return NextResponse.json(
      { error: "That code doesn't match. Check the app shows MegaDeal (admin) and enter its current code." },
      { status: 400, headers: NO_STORE }
    );
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
