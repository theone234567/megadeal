import { NextRequest, NextResponse } from "next/server";
import { getVerifiedMember } from "@/lib/memberAuth";
import { createWixAdminClient } from "@/lib/wixAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { isAdminRequest } from "@/lib/adminSession";
import { newPhotoKey, photoBucket, photoStorage, putPhoto } from "@/lib/photoStorage";
import { SITE_URL } from "@/lib/siteConfig";

// Generous cap on the decoded image — the client already resizes/compresses
// before sending, this just guards against an oversized/malicious payload.
const MAX_BYTES = 3_000_000;

// Deliberately excludes image/svg+xml: an SVG can carry embedded <script>
// content, and there's no legitimate reason a deal or logo photo needs to
// be one — every upload here comes from a photo file input or canvas
// compression, never vector art.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Longest slug we'll keep before appending the disambiguating suffix — well
// under any filesystem/URL limit, just short enough that the Media Manager
// listing stays scannable.
const MAX_SLUG_LENGTH = 60;

/**
 * Turns a free-text label (business name, deal name — ultimately whatever a
 * merchant typed) into a clean, URL-safe filename fragment. Runs server-side
 * so the label is never trusted as-is: this is the only thing standing
 * between "World's #1 Fish & Chips!! 🐟" (or something actually offensive)
 * and a public, permanent, googleable Wix Media filename.
 */
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents after NFKD decomposition
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ""); // slice() can leave a trailing hyphen mid-word
}

/** The first bytes every file of this image type starts with. */
function looksLike(mimeType: string, bytes: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  switch (mimeType) {
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/gif":
      return starts(0x47, 0x49, 0x46, 0x38);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    default:
      return false;
  }
}

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
  // Admins upload too — replacing a deal's photo from the admin editor.
  const admin = !member && (await isAdminRequest(req));
  if (!member && !admin) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Needing an account is not a budget. Every accepted call writes up to
  // 3MB into Wix Media Manager permanently, and nothing here ever deletes
  // it — so one signed-in merchant, or one stolen session, could fill the
  // site's media storage in a loop at no cost to themselves. Keyed on the
  // member rather than the IP: the member id is the thing we've actually
  // verified, and it doesn't punish a whole office behind one address.
  const { limited } = await checkRateLimit(`upload-photo:${member ? member.id : "admin"}`, 60, 60 * 60);
  if (limited) {
    return NextResponse.json(
      { error: "That's a lot of photos at once — please try again in a little while." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const dataUrl = body?.dataUrl;
  const label = typeof body?.label === "string" ? body.label : "";
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

  // The file's contents must be the image type it claims: a renamed file
  // (an HTML page called .png, say) is turned away, so nothing but real
  // images is ever stored or served back from the site.
  if (!looksLike(mimeType, bytes)) {
    return NextResponse.json({ error: "Please upload a JPEG, PNG, WebP or GIF image." }, { status: 400 });
  }

  // MegaDeal's own storage, once switched on (lib/photoStorage.ts). The
  // key doubles as the id the deal form passes back.
  if (photoStorage() === "r2") {
    try {
      const bucket = await photoBucket();
      if (!bucket) {
        console.error("[upload-photo] PHOTO_STORAGE=r2 but no PHOTOS bucket is bound");
        return NextResponse.json({ error: "Couldn't start the upload." }, { status: 502 });
      }
      const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const key = newPhotoKey(slugify(label), ext);
      const url = await putPhoto(bucket, key, bytes, mimeType, SITE_URL);
      return NextResponse.json({ url, id: key });
    } catch (err) {
      console.error("[upload-photo] storage failed", err);
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }
  }

  try {
    const adminClient = createWixAdminClient();
    const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
    // A short random suffix, not the label alone, disambiguates repeat
    // uploads under the same business/deal name — Wix addresses the file by
    // the id it returns, never by this name, so the suffix only needs to
    // avoid two uploads looking identical in the Media Manager listing.
    const suffix = Math.random().toString(36).slice(2, 8);
    const slug = slugify(label);
    const fileName = `${slug || "megadeal-photo"}-${suffix}.${ext}`;

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
