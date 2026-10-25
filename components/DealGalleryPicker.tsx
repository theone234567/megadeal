"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_DEAL_GALLERY } from "@/lib/dealGallery";
import { uploadPhoto } from "@/lib/imageUpload";
import { wixImageUrl } from "@/lib/wixImageUrl";

/**
 * A deal's extra photos (up to four besides the main one): tick photos
 * from the business's profile, or upload new ones. They show in the order
 * chosen, after the main photo, in the deal page's gallery. Uploads go up
 * straight away, so a draft keeps them.
 */
export default function DealGalleryPicker({
  value,
  onChange,
  profilePhotos,
  mainUrl,
  label,
  id = "deal-gallery",
}: {
  value: string[];
  onChange: (gallery: string[]) => void;
  /** The business's profile photos, offered to tick. */
  profilePhotos: string[];
  /** The main photo, which isn't offered again. */
  mainUrl: string | null;
  label?: string;
  id?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_DEAL_GALLERY;
  const offered = profilePhotos.filter((p) => p !== mainUrl);
  // The list as it is now, not when an upload started: a photo ticked
  // while one uploads was dropped when the upload finished (T250).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const toggle = (url: string) => onChange(value.includes(url) ? value.filter((u) => u !== url) : full ? value : [...value, url]);

  async function upload(file: File | undefined) {
    if (!file || full) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadPhoto(file, label);
      // The same picture comes back with the same address (named by its
      // content, app/api/upload-photo), so a repeat is caught here.
      const now = latest.current;
      if (url === mainUrl || now.includes(url)) {
        setError(url === mainUrl ? "That's already the main photo." : "That photo is already added.");
        return;
      }
      if (now.length >= MAX_DEAL_GALLERY) {
        setError(`You've already added ${MAX_DEAL_GALLERY} photos. Remove one to add this.`);
        return;
      }
      const next = [...now, url];
      latest.current = next;
      onChange(next);
    } catch (err: any) {
      setError(err?.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const thumb = (url: string) => (url.startsWith("/megadeal-") ? url : wixImageUrl(url, 360, 240));

  return (
    <fieldset aria-describedby={`${id}-hint`}>
      <legend className="mb-1 block font-display text-base font-bold text-slate-900">
        More photos <span className="font-sans text-sm font-normal text-slate-500">(optional)</span>
      </legend>
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-slate-600">
        Up to {MAX_DEAL_GALLERY} more, shown after the main photo on the deal page: the place, the team, other angles of
        the offer. Pick from your business profile or upload new ones.
      </p>

      {value.length > 0 && (
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Chosen photos, in order">
          {value.map((url, i) => (
            <li key={url} className="relative overflow-hidden rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(url)} alt="" className="aspect-[3/2] w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-bold text-slate-800">
                {i + 2}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                aria-label={`Remove photo ${i + 2}`}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-slate-700 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {offered.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold text-slate-700">From your business profile</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {offered.map((url) => {
              const on = value.includes(url);
              return (
                <button
                  key={url}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => toggle(url)}
                  className={`relative overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-40 ${
                    on ? "border-brand-600" : "border-transparent hover:border-brand-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(url)} alt="" className="aspect-[3/2] w-full object-cover" />
                  <span className="sr-only">{on ? "Remove this profile photo" : "Add this profile photo"}</span>
                  {on && (
                    <span aria-hidden="true" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.6875rem] font-bold text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex cursor-pointer items-center rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700 focus-within:ring-2 focus-within:ring-brand-600 hover:bg-brand-100 ${
            full || uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {uploading ? "Uploading…" : "Upload a photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={full || uploading}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-xs text-slate-500">
          {value.length} of {MAX_DEAL_GALLERY} added
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
