const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.75;
const MAX_DATA_URL_LENGTH = 2_500_000; // generous; final storage is a short URL, this only caps the upload payload

/**
 * Resizes and compresses an image file client-side into a JPEG data URL.
 * Used as an intermediate step before uploading to Wix Media Manager (see
 * uploadPhoto below) — compressing first keeps the upload fast and the
 * final hosted image reasonably sized regardless of the original photo.
 */
export function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Couldn't process that image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      if (dataUrl.length > MAX_DATA_URL_LENGTH) {
        reject(new Error("That image is too large even after compression — try a smaller photo."));
        return;
      }
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image file."));
    };

    img.src = objectUrl;
  });
}

export interface UploadedPhoto {
  url: string;
  id: string;
}

/**
 * Compresses an image client-side, then uploads it to Wix Media Manager
 * via our own server route and returns the resulting CDN-hosted URL (and
 * Wix media id, needed when attaching the photo to a Stores product).
 * This is what actually gets stored now, instead of a raw base64 data URL
 * — smaller records, a real cached/optimized image, and a URL that can be
 * reused as product media.
 */
export async function uploadPhoto(file: File): Promise<UploadedPhoto> {
  const dataUrl = await fileToCompressedDataUrl(file);
  const res = await fetch("/api/upload-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.url || !body?.id) {
    throw new Error(body?.error || "Couldn't upload that photo. Please try again.");
  }
  return { url: body.url, id: body.id };
}
