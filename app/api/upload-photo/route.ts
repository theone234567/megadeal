import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";

// Generous cap on the decoded image — the client already resizes/compresses
// before sending, this just guards against an oversized/malicious payload.
const MAX_BYTES = 3_000_000;

// Deliberately excludes image/svg+xml: an SVG can carry embedded <script>
// content, and there's no legitimate reason a deal or logo photo needs to
// be one — every upload here comes from a photo file input or canvas
// compression, never vector art.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Uploads a client-compressed photo to Wix Media Manager and returns its
 * real, CDN-hosted URL (plus the Wix media id, needed when attaching the
 * image to a Stores product). Replaces storing raw base64 data URLs
 * directly on Wix Data items: those bloated every deal/merchant record,
 * and unlike a Wix Media Manager URL, a data URL is never cached or
 * optimized by Wix's own image CDN.
 *
 * Uses the admin (API key) client rather than the member's own token —
 * this is the same elevated client already used for the rest of the
 * server-side write paths, and site-media file uploads aren't something a
 * plain visitor/member token can do.
 */
export async function POST(req: NextRequest) {
  const member = await getVerifiedMember(req);
  if (!member) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const dataUrl = body?.dataUrl;
  const match =
    typeof dataUrl === "string"
      ? dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      : null;
  if (!match) {
    return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
  }

  const mimeType = match[1];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "Please upload a JPEG, PNG, WebP or GIF image." }, { status: 400 });
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "That image is too large." }, { status: 400 });
  }

  try {
    const adminClient = createWixAdminClient();
    const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
    const fileName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const genRes = await adminClient.fetchWithAuth(
      "https://www.wixapis.com/site-media/v1/files/generate-upload-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType, fileName }),
      }
    );
    if (!genRes.ok) {
      return NextResponse.json({ error: "Couldn't start the upload." }, { status: 502 });
    }
    const { uploadUrl } = await genRes.json();

    // The generated uploadUrl is a signed, self-authorizing URL — no admin
    // auth header needed (or wanted) on this specific request.
    const uploadRes = await fetch(`${uploadUrl}?filename=${encodeURIComponent(fileName)}`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: bytes,
    });
    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }
    const uploadJson = await uploadRes.json();
    const url = uploadJson?.file?.url;
    const id = uploadJson?.file?.id;
    if (!url || !id) {
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }

    return NextResponse.json({ url, id });
  } catch (err) {
    console.error("[upload-photo] failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
