"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "@/lib/imageUpload";
import { MAX_BUSINESS_PHOTOS } from "@/lib/businessPhotos";

interface PhotoGalleryFieldProps {
  /** Already-saved photo URLs. */
  photos: string[];
  warningText: string;
  onConfirm: (photos: string[]) => Promise<void>;
}

/**
 * Multi-photo version of PhotoUploadField — up to MAX_BUSINESS_PHOTOS
 * photos, at least one required. Each add/remove is staged locally first;
 * nothing reaches the server (and nothing sends the listing back for
 * review) until Confirm, same as the single-logo field it replaced.
 */
export default function PhotoGalleryField({ photos, warningText, onConfirm }: PhotoGalleryFieldProps) {
  // Staged working copy. null until the visitor makes a change, so
  // "nothing to confirm" is exactly "no local edits yet" rather than
  // needing a second dirty flag kept in sync with this array.
  const [staged, setStaged] = useState<string[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = staged ?? photos;
  const dirty = staged !== null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadPhoto(file);
      setStaged([...current, url]);
    } catch (err: any) {
      setError(err?.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    setStaged(current.filter((_, i) => i !== index));
  }

  function cancel() {
    setStaged(null);
    setError(null);
  }

  async function confirm() {
    if (!staged || staged.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(staged);
      setStaged(null);
    } catch (err: any) {
      setError(err?.message || "Couldn't save those photos. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {current.map((url, i) => (
          <div
            key={url + i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove this photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        {current.length < MAX_BUSINESS_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
          >
            <span className="text-xl leading-none">{uploading ? "…" : "+"}</span>
            <span className="text-[11px] font-semibold">{uploading ? "Uploading" : "Add photo"}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {current.length}/{MAX_BUSINESS_PHOTOS} photos · at least 1 required
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {dirty && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">⚠️ {warningText}</p>
          {staged?.length === 0 && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              At least one photo is required — add one before saving.
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={saving || staged?.length === 0}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm change"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
