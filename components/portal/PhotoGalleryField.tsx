"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "@/lib/imageUpload";
import { MAX_BUSINESS_PHOTOS } from "@/lib/businessPhotos";

interface PhotoGalleryFieldProps {
  /** Already-saved photo URLs. */
  photos: string[];
  warningText: string;
  onConfirm: (photos: string[]) => Promise<void>;
  /** Business name — used to give each upload a readable, SEO-friendly filename. */
  label?: string;
  /** Save each change as soon as it's made, with no Confirm step: for a
   *  business not yet approved, where a change has nothing to warn about.
   *  Otherwise a photo added while finishing the listing waited for a
   *  Confirm that was easy to miss, and was lost on "Submit". */
  saveRightAway?: boolean;
}

/**
 * Multi-photo version of PhotoUploadField — up to MAX_BUSINESS_PHOTOS
 * photos, at least one required. Each add/remove is staged locally first;
 * nothing reaches the server (and nothing sends the listing back for
 * review) until Confirm, same as the single-logo field it replaced, unless
 * `saveRightAway`.
 */
export default function PhotoGalleryField({ photos, warningText, onConfirm, label, saveRightAway = false }: PhotoGalleryFieldProps) {
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
      const { url } = await uploadPhoto(file, label);
      const next = [...current, url];
      setStaged(next);
      if (saveRightAway) await save(next);
    } catch (err: any) {
      setError(err?.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    const next = current.filter((_, i) => i !== index);
    setStaged(next);
    // The last photo can't go on its own: one is required.
    if (saveRightAway && next.length > 0) void save(next);
  }

  function cancel() {
    setStaged(null);
    setError(null);
  }

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(next);
      setStaged(null);
    } catch (err: any) {
      // Kept staged, so Confirm (below) can try again.
      setError(err?.message || "Couldn't save those photos. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirm() {
    if (!staged || staged.length === 0) return;
    await save(staged);
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
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
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

      <p className="mt-2 text-xs text-slate-500" aria-live="polite">
        {current.length}/{MAX_BUSINESS_PHOTOS} photos · at least 1 required
        {saveRightAway && saving && " · Saving…"}
      </p>

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Saving straight away, the box only appears if a save failed or the last photo was removed. */}
      {dirty && (!saveRightAway || (!saving && (error || staged?.length === 0))) && (
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
